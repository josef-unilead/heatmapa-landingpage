// Testy odbavení vstupenky proti skutečnému Postgresu.
//
// Souběh se nedá otestovat mockem. Celý smysl check_in_ticket() je v tom, že
// stav mění jedním UPDATE s podmínkou, takže ze dvou současných požadavků
// uspěje právě jeden. Test proto pouští opravdovou databázi a střílí na ni
// paralelní volání.
//
// Spuštění:  npm run test:db

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, ".pgdata-checkin");
const PORT = 54331;

let pg;
let sql;
let eventId;
let eventRef;

before(async () => {
  rmSync(DATA_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "postgres", password: "postgres",
    port: PORT, persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("checkin");

  sql = postgres({
    host: "localhost", port: PORT, user: "postgres", password: "postgres",
    database: "checkin", max: 30, prepare: false, onnotice: () => {},
  });

  await sql`create role anon`;
  await sql`create role authenticated`;
  await sql`create role service_role`;

  // Evidenci migrací zakládá migrační skript, ne migrace samotná. Bez ní
  // spadne 0003, která na ní zapíná RLS.
  await sql`create table if not exists public._migrations (
    name text primary key, applied_at timestamptz not null default now())`;

  // Pustíme migrace v pořadí, ať se testuje přesně to, co je na produkci,
  // a zároveň se ověří, že na sebe navazují.
  const dir = join(ROOT, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await sql.unsafe(readFileSync(join(dir, file), "utf8"));
  }

  const [event] = await sql`
    insert into events (slug, title, starts_at, venue_name, venue_address, capacity, is_published)
    values ('odbaveni', 'Testovací akce', now() + interval '1 day',
            'Bar Zvon', 'Staroměstské náměstí 605/13', 100, true)
    returning id, ref`;
  eventId = event.id;
  eventRef = event.ref;
}, { timeout: 300000 });

after(async () => {
  await sql?.end();
  await pg?.stop();
  rmSync(DATA_DIR, { recursive: true, force: true });
});

/** Potvrzená rezervace připravená k odbavení. */
async function vstupenka(jmeno = "Jan") {
  const [row] = await sql`
    insert into reservations (event_id, first_name, last_name, email, email_normalized,
      phone_e164, consent_gdpr, status, pending_expires_at, confirmed_at)
    values (${eventId}, ${jmeno}, 'Novák',
      ${`${jmeno}${Math.random()}@example.com`}, ${`${jmeno}${Math.random()}@example.com`},
      ${"+4207770" + Math.floor(Math.random() * 100000).toString().padStart(5, "0")},
      true, 'confirmed', now() + interval '1 hour', now())
    returning ticket_id`;
  return row.ticket_id;
}

const odbav = (ticketId, { staff = "obsluha-a", staffId = null, ref = eventRef,
                          source = "online", idem = 5, scannedAt = null } = {}) =>
  sql`select check_in_ticket(${ticketId}, ${ref}::smallint, ${staffId}, ${staff},
        ${source}, ${scannedAt ?? sql`now()`}, ${idem}) as r`.then((rows) => rows[0].r);

describe("odbavení vstupenky", () => {
  test("dvě současná odbavení téže vstupenky projdou právě jednou", async () => {
    const ticket = await vstupenka();

    // Dvě volání skutečně naráz, každé na vlastním spojení z poolu.
    const [a, b] = await Promise.all([
      odbav(ticket, { staff: "vchod-1", staffId: null, idem: 0 }),
      odbav(ticket, { staff: "vchod-2", staffId: null, idem: 0 }),
    ]);

    const uspechy = [a, b].filter((r) => r.ok);
    const konflikty = [a, b].filter((r) => !r.ok);

    console.log(`    → prošlo ${uspechy.length}, odmítnuto ${konflikty.length} (${konflikty[0]?.result})`);

    assert.equal(uspechy.length, 1, "pustit se má právě jedno odbavení");
    assert.equal(konflikty.length, 1);
    assert.equal(konflikty[0].result, "already_used");
    assert.ok(konflikty[0].checkedInAt, "konflikt musí nést čas prvního odbavení");
    assert.equal(konflikty[0].lastName, "Novák", "a jméno, ať obsluha ví, koho už pustili");
  });

  test("ani při deseti současných pokusech neprojde víc než jeden", async () => {
    const ticket = await vstupenka("Petra");
    const vysledky = await Promise.all(
      Array.from({ length: 10 }, (_, i) => odbav(ticket, { staff: `vchod-${i}`, idem: 0 })),
    );
    assert.equal(vysledky.filter((r) => r.ok).length, 1);
  });

  test("opakovaný sken tímtéž telefonem do pár sekund je v pořádku", async () => {
    const ticket = await vstupenka("Tomáš");
    const prvni = await odbav(ticket, { staff: "vchod-1" });
    const druhy = await odbav(ticket, { staff: "vchod-1" });

    assert.ok(prvni.ok);
    assert.ok(druhy.ok, "stejná obsluha do pár sekund nemá dostat konflikt");
    assert.equal(druhy.repeat, true);
  });

  test("tentýž sken po uplynutí okna je už konflikt", async () => {
    const ticket = await vstupenka("Klára");
    await odbav(ticket, { staff: "vchod-1" });
    // Posuneme čas odbavení do minulosti, jako by uplynulo víc než okno.
    await sql`update reservations set checked_in_at = now() - interval '1 minute'
               where ticket_id = ${ticket}`;
    const pozdeji = await odbav(ticket, { staff: "vchod-1" });
    assert.equal(pozdeji.ok, false);
    assert.equal(pozdeji.result, "already_used");
  });

  test("jiná obsluha nedostane opakování, ale konflikt", async () => {
    const ticket = await vstupenka("Marek");
    await odbav(ticket, { staff: "vchod-1" });
    const jina = await odbav(ticket, { staff: "vchod-2" });
    assert.equal(jina.ok, false);
    assert.equal(jina.result, "already_used");
    assert.equal(jina.checkedInBy, "vchod-1", "musí být vidět, kdo pustil první");
  });
});

describe("důvody odmítnutí", () => {
  test("neexistující vstupenka", async () => {
    const r = await odbav("00000000-0000-0000-0000-000000000000");
    assert.equal(r.result, "not_found");
  });

  test("vstupenka na jinou akci", async () => {
    const ticket = await vstupenka("Eva");
    const r = await odbav(ticket, { ref: 999 });
    assert.equal(r.ok, false);
    assert.equal(r.result, "wrong_event");
    assert.ok(r.eventTitle, "obsluha má vidět, na jakou akci vstupenka patří");
  });

  test("zrušená vstupenka", async () => {
    const ticket = await vstupenka("Lukáš");
    await sql`update reservations set status='cancelled' where ticket_id=${ticket}`;
    const r = await odbav(ticket);
    assert.equal(r.result, "cancelled");
  });

  test("revokovaná vstupenka", async () => {
    const ticket = await vstupenka("Ivana");
    await sql`update reservations set status='revoked' where ticket_id=${ticket}`;
    const r = await odbav(ticket);
    assert.equal(r.result, "revoked");
  });

  test("nepotvrzená rezervace", async () => {
    const ticket = await vstupenka("Radek");
    await sql`update reservations set status='pending' where ticket_id=${ticket}`;
    const r = await odbav(ticket);
    assert.equal(r.result, "not_confirmed");
  });
});

describe("vzetí zpět", () => {
  test("čerstvé odbavení jde vzít zpět", async () => {
    const ticket = await vstupenka("Alena");
    await odbav(ticket);
    const [{ r }] = await sql`select undo_check_in(${ticket}, null, 'vchod-1', 30) as r`;
    assert.equal(r.ok, true);

    const [res] = await sql`select status, checked_in_at from reservations where ticket_id=${ticket}`;
    assert.equal(res.status, "confirmed");
    assert.equal(res.checked_in_at, null);
  });

  test("po třiceti sekundách už ne", async () => {
    const ticket = await vstupenka("Ondřej");
    await odbav(ticket);
    await sql`update reservations set checked_in_at = now() - interval '31 seconds'
               where ticket_id = ${ticket}`;
    const [{ r }] = await sql`select undo_check_in(${ticket}, null, 'vchod-1', 30) as r`;
    assert.equal(r.ok, false);
    assert.equal(r.result, "too_late");
  });

  test("po vzetí zpět jde odbavit znovu", async () => {
    const ticket = await vstupenka("Simona");
    await odbav(ticket);
    await sql`select undo_check_in(${ticket}, null, 'vchod-1', 30)`;
    const znovu = await odbav(ticket);
    assert.equal(znovu.ok, true);
  });
});

describe("log odbavení", () => {
  test("zapisuje se každý pokus, i odmítnutý", async () => {
    const ticket = await vstupenka("Bohdan");
    const [{ count: pred }] = await sql`select count(*)::int as count from checkin_log`;

    await odbav(ticket, { staff: "vchod-1" });                 // ok
    await odbav(ticket, { staff: "vchod-2", idem: 0 });         // already_used
    await odbav("00000000-0000-0000-0000-000000000000");        // not_found

    const [{ count: po }] = await sql`select count(*)::int as count from checkin_log`;
    assert.equal(po - pred, 3, "všechny tři pokusy musí být v logu");

    const zaznamy = await sql`
      select result, staff_label, source from checkin_log
       order by id desc limit 3`;
    assert.deepEqual(zaznamy.map((z) => z.result), ["not_found", "already_used", "ok"]);
  });

  test("offline záznam si nese čas skenu, ne čas zápisu", async () => {
    const ticket = await vstupenka("Nela");
    const kdy = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    await odbav(ticket, { source: "offline", scannedAt: kdy, idem: 0 });

    const [zaznam] = await sql`
      select source, scanned_at, created_at from checkin_log
       where result = 'ok' order by id desc limit 1`;
    assert.equal(zaznam.source, "offline");
    assert.ok(zaznam.scanned_at < zaznam.created_at, "sken proběhl dřív než zápis");
  });
});
