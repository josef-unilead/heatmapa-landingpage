// Test atomické kapacity proti skutečnému Postgresu.
//
// Nejde otestovat mockem: celý smysl create_reservation() je v tom, jak se
// chová zámek řádku při souběhu. Test si proto pustí opravdovou databázi,
// nalije do ní ostrou migraci a vystřelí na ni stovky současných požadavků.
//
// Spuštění:  npm run test:db
// První běh chvíli trvá, stahuje se binárka Postgresu.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, ".pgdata-test");
const PORT = 54329;

let pg;
let sql;

before(async () => {
  rmSync(DATA_DIR, { recursive: true, force: true });

  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("guestlist");

  sql = postgres({
    host: "localhost", port: PORT, user: "postgres", password: "postgres",
    database: "guestlist", max: 30, prepare: false, onnotice: () => {},
  });

  // Role, které na Supabase existují a migrace se na ně odkazuje.
  await sql`create role anon`;
  await sql`create role authenticated`;

  await sql.unsafe(
    readFileSync(join(ROOT, "supabase", "migrations", "0001_guestlist.sql"), "utf8"),
  );
}, { timeout: 300000 });

after(async () => {
  await sql?.end();
  await pg?.stop();
  rmSync(DATA_DIR, { recursive: true, force: true });
});

async function createEvent({ capacity = 100, slug = "test-akce" } = {}) {
  await sql`delete from events where slug = ${slug}`;
  const [event] = await sql`
    insert into events (slug, title, starts_at, venue_name, venue_address, capacity, is_published)
    values (${slug}, 'Testovací akce', now() + interval '30 days',
            'Bar Zvon', 'Staroměstské náměstí 605/13', ${capacity}, true)
    returning *`;
  return event;
}

function reserve(slug, i) {
  return sql`
    select create_reservation(
      ${slug}, ${"Jan"}, ${"Novák"},
      ${`test${i}@example.com`}, ${`test${i}@example.com`}, ${`+42077700${String(i).padStart(4, "0")}`},
      'cs', false, ${`hash-${slug}-${i}`}, ${`ip-${i}`}, null, 3
    ) as result`;
}

describe("kapacita akce", () => {
  test("200 souběžných registrací na 100 míst vytvoří přesně 100 rezervací", async () => {
    const event = await createEvent({ capacity: 100, slug: "soubeh" });

    // Všech 200 se pošle najednou, každá na vlastním spojení z poolu.
    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) => reserve("soubeh", i)),
    );

    const outcomes = results.map((r) => r[0].result);
    const ok = outcomes.filter((o) => o.ok).length;
    const full = outcomes.filter((o) => !o.ok && o.reason === "full").length;

    const [{ count }] = await sql`
      select count(*)::int as count from reservations
       where event_id = ${event.id}
         and (status in ('confirmed','checked_in')
              or (status = 'pending' and pending_expires_at > now()))`;

    console.log(`    → přijato ${ok}, odmítnuto jako plné ${full}, v databázi ${count}`);

    assert.equal(ok, 100, "přijmout se má přesně 100 registrací");
    assert.equal(full, 100, "zbylých 100 má dostat důvod full");
    assert.equal(count, 100, "v databázi musí být přesně 100 obsazených míst");
  });

  test("žádná rezervace navíc ani při kapacitě 1", async () => {
    await createEvent({ capacity: 1, slug: "jedno-misto" });
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => reserve("jedno-misto", i)),
    );
    const ok = results.filter((r) => r[0].result.ok).length;
    assert.equal(ok, 1);
  });

  test("stejný e-mail se na akci nedostane dvakrát", async () => {
    const event = await createEvent({ slug: "duplicity" });
    const same = () => sql`
      select create_reservation(
        'duplicity', 'Jan', 'Novák', 'jan@example.com', 'jan@example.com',
        '+420777111222', 'cs', false, ${`h-${Math.random()}`}, null, null, 3
      ) as result`;

    const [first, second] = await Promise.all([same(), same()]);
    const outcomes = [first[0].result, second[0].result];

    assert.equal(outcomes.filter((o) => o.ok).length, 1, "projít smí jen jedna");
    assert.equal(outcomes.find((o) => !o.ok).reason, "duplicate");

    const [{ count }] = await sql`
      select count(*)::int as count from reservations where event_id = ${event.id}`;
    assert.equal(count, 1);
  });

  test("nepotvrzená rezervace po lhůtě uvolní místo", async () => {
    const event = await createEvent({ capacity: 1, slug: "vyprseni" });

    const [first] = await reserve("vyprseni", 1);
    assert.ok(first.result.ok);

    // Druhá se nevejde, místo drží nepotvrzená rezervace.
    const [blocked] = await reserve("vyprseni", 2);
    assert.equal(blocked.result.reason, "full");

    // Posuneme lhůtu do minulosti, jako by uplynulo 30 minut.
    await sql`update reservations set pending_expires_at = now() - interval '1 minute'
               where event_id = ${event.id}`;

    const [third] = await reserve("vyprseni", 3);
    assert.ok(third.result.ok, "po vypršení se místo musí uvolnit");

    const [{ cancelled }] = await sql`
      select count(*)::int as cancelled from reservations
       where event_id = ${event.id} and status = 'cancelled' and cancelled_reason = 'expired'`;
    assert.equal(cancelled, 1);
  });

  test("víc než tři rezervace z jedné IP na akci neprojdou", async () => {
    await createEvent({ slug: "ip-limit" });
    const fromSameIp = (i) => sql`
      select create_reservation(
        'ip-limit', 'Jan', 'Novák', ${`ip${i}@example.com`}, ${`ip${i}@example.com`},
        ${`+42077766${String(i).padStart(4, "0")}`}, 'cs', false,
        ${`h-ip-${i}`}, 'stejna-ip', null, 3
      ) as result`;

    const outcomes = [];
    for (let i = 0; i < 5; i++) outcomes.push((await fromSameIp(i))[0].result);

    assert.equal(outcomes.filter((o) => o.ok).length, 3);
    assert.equal(outcomes[3].reason, "ip_limit");
    assert.equal(outcomes[4].reason, "ip_limit");
  });
});

describe("potvrzení rezervace", () => {
  test("dvojklik na odkaz potvrdí jen jednou", async () => {
    await createEvent({ slug: "potvrzeni" });
    const hash = "token-hash-abc";
    await sql`
      select create_reservation('potvrzeni', 'Jan', 'Novák', 'p@example.com',
        'p@example.com', '+420777999888', 'cs', false, ${hash}, null, null, 3)`;

    const [a, b] = await Promise.all([
      sql`select confirm_reservation(${hash}) as r`,
      sql`select confirm_reservation(${hash}) as r`,
    ]);

    const results = [a[0].r, b[0].r];
    assert.ok(results.every((r) => r.ok), "obě volání mají skončit úspěchem");
    assert.equal(
      results.filter((r) => r.first_time).length, 1,
      "vstupenka se smí odeslat jen při prvním potvrzení",
    );
  });

  test("vypršený odkaz neprojde", async () => {
    await createEvent({ slug: "vyprseny-odkaz" });
    const hash = "token-hash-stary";
    await sql`
      select create_reservation('vyprseny-odkaz', 'Jan', 'Novák', 'v@example.com',
        'v@example.com', '+420777999111', 'cs', false, ${hash}, null, null, 3)`;
    await sql`update reservations set confirm_expires_at = now() - interval '1 minute'
               where confirm_token_hash = ${hash}`;

    const [row] = await sql`select confirm_reservation(${hash}) as r`;
    assert.equal(row.r.ok, false);
    assert.equal(row.r.reason, "expired");
  });

  test("neznámý token neprozradí nic", async () => {
    const [row] = await sql`select confirm_reservation('neexistuje') as r`;
    assert.equal(row.r.ok, false);
    assert.equal(row.r.reason, "invalid");
  });
});

describe("volná místa", () => {
  test("počítají se z rezervací, ne z uloženého čísla", async () => {
    await createEvent({ capacity: 10, slug: "pocitadlo" });

    const before = (await sql`select event_availability('pocitadlo') as a`)[0].a;
    assert.equal(before.taken, 0);

    for (let i = 0; i < 4; i++) await reserve("pocitadlo", 1000 + i);

    const after = (await sql`select event_availability('pocitadlo') as a`)[0].a;
    assert.equal(after.taken, 4);
    assert.equal(after.capacity, 10);

    // Počítadlo pro realtime musí sedět se skutečností.
    const [{ taken }] = await sql`
      select ec.taken from event_counters ec
      join events e on e.id = ec.event_id where e.slug = 'pocitadlo'`;
    assert.equal(taken, 4);
  });
});
