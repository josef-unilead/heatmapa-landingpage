// Průchod čtečkou v prohlížeči, včetně kamery.
//
// Chrome dostane místo kamery video se skutečným QR kódem naší vstupenky,
// takže se testuje celá cesta: obraz → dekódování → ověření podpisu →
// odbavení na serveru → zobrazení výsledku.
//
// Spuštění:  npm run test:scanner:ui
// Potřebuje běžící `npm run dev:api` a `npx vite preview --port 5173`.

import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { signTicket } from "../../api/_lib/tokens.js";
import { vyrobY4M } from "./makeFakeCamera.mjs";

const BASE = "http://localhost:5173";
const OUT = "tests/e2e/screenshots";
mkdirSync(OUT, { recursive: true });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

// ── Příprava dat ────────────────────────────────────────────────────────────
const { data: ev } = await db.from("events").select("id, ref, slug")
  .eq("slug", "what-the-f3ck-is-heatmapa").single();

const KOD = "SCAN99";
await db.from("staff_codes").delete().eq("event_id", ev.id);
await db.from("staff_codes").insert({
  id: randomUUID(), event_id: ev.id, label: "Vchod test", is_active: true,
  code_hash: createHash("sha256").update(KOD).digest("hex"),
});

await db.from("reservations").delete().like("email", "ui-scan%");
const { data: rez } = await db.from("reservations").insert({
  event_id: ev.id, first_name: "Marie", last_name: "Svobodová",
  email: "ui-scan@example.com", email_normalized: "ui-scan@example.com",
  phone_e164: "+420777654321", consent_gdpr: true, status: "confirmed",
  pending_expires_at: new Date(Date.now() + 3600e3).toISOString(),
  confirmed_at: new Date().toISOString(),
}).select("ticket_id").single();

const token = signTicket({ eventRef: ev.ref, ticketId: rez.ticket_id });
const video = join(OUT, "fake-camera.y4m");
writeFileSync(video, vyrobY4M(token));
console.log(`Připraveno: vstupenka pro Marii Svobodovou, video ${video}\n`);

// ── Prohlížeč s předstíranou kamerou ────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: "shell",
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-video-capture=${video}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await browser.defaultBrowserContext().overridePermissions(BASE, ["camera"]);

const stav = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

// ── Přihlášení ──────────────────────────────────────────────────────────────
await page.goto(`${BASE}/scanner`, { waitUntil: "networkidle0" });

await page.type('input[type="text"]', "SPATNY");
await page.click('button[type="submit"]');
await page.waitForFunction(() => /neplatí/i.test(document.body.innerText), { timeout: 10000 });
console.log("  ✓ špatný kód odmítnut");

await page.reload({ waitUntil: "networkidle0" });
await page.type('input[type="text"]', KOD);
await page.click('button[type="submit"]');
await page.waitForFunction(() => /Skenovat/i.test(document.body.innerText), { timeout: 15000 });
console.log("  ✓ přihlášení kódem obsluhy");

await new Promise((r) => setTimeout(r, 3000));
const poPrihlaseni = await stav();
console.log(`  ✓ stavový pruh: ${poPrihlaseni.match(/Online|Bez signálu/)?.[0]}, ` +
            `${poPrihlaseni.match(/Odbaveno \d+ z \d+/)?.[0] ?? "seznam nestažen"}`);
await page.screenshot({ path: `${OUT}/scanner-1-pripraveno.png` });

// ── Sken z kamery ───────────────────────────────────────────────────────────
console.log("\nČekám, až čtečka přečte kód z kamery...");
await page.waitForFunction(
  () => /Pusť dovnitř|Už použitá|Neplatná/i.test(document.body.innerText),
  { timeout: 30000 },
);
const vysledek = await stav();
console.log(`  ✓ výsledek: ${vysledek.match(/(Pusť dovnitř|Už použitá|Neplatná vstupenka)/)?.[0]}`);
console.log(`  ✓ jméno na obrazovce: ${/Marie Svobodová/.test(vysledek) ? "ano" : "CHYBÍ"}`);
console.log(`  ✓ nabídka vzít zpět: ${/Vzít zpět/.test(vysledek) ? "ano" : "ne"}`);
await page.screenshot({ path: `${OUT}/scanner-2-prosel.png` });

// ── Ověření v databázi ──────────────────────────────────────────────────────
const { data: poOdbaveni } = await db.from("reservations")
  .select("status, checked_in_by").eq("ticket_id", rez.ticket_id).single();
console.log(`  ✓ v databázi: ${poOdbaveni.status}, odbavil ${poOdbaveni.checked_in_by}`);

// ── Druhý sken téže vstupenky ───────────────────────────────────────────────
//
// Server má pětisekundové okno, ve kterém bere opakovaný sken toutéž obsluhou
// jako úspěch, ne jako konflikt. Test musí počkat, až uplyne, jinak by měřil
// idempotenci a ne detekci dvojího průchodu.
// Dokud běží to pětisekundové okno, další skeny se vrací jako opakování a
// zobrazí se znovu zelená. Zavíráme překryv dokola, dokud se neobjeví konflikt.
// Zavřít překryv, počkat na další sken a teprve pak číst. Číst po zavření
// by výsledek minulo. Opakuje se to, protože dokud běží pětisekundové okno,
// další skeny se vrací jako opakování a zobrazí se zase zelená.
const prekryvJe = () => page.evaluate(() => Boolean(document.querySelector("[data-scan-result]")));

let druhy = "";
for (let pokus = 0; pokus < 12; pokus++) {
  await page.evaluate(() => document.querySelector("[data-scan-result]")?.click());

  // Čekání na nový překryv, ne pevná pauza: dekódování má vlastní tempo.
  for (let tik = 0; tik < 20 && !(await prekryvJe()); tik++) {
    await new Promise((r) => setTimeout(r, 300));
  }

  druhy = await stav();
  if (/Už použitá/.test(druhy)) break;
}

console.log(`\n  ✓ druhý sken: ${druhy.match(/Už použitá/)?.[0] ?? "NEDOŠLO KE KONFLIKTU"}` +
            `${druhy.match(/Odbaveno v \d+:\d+/) ? ", " + druhy.match(/Odbaveno v \d+:\d+/)[0] : ""}`);
await page.screenshot({ path: `${OUT}/scanner-3-uz-pouzita.png` });

// ── Úklid ───────────────────────────────────────────────────────────────────
await db.from("reservations").delete().like("email", "ui-scan%");
await db.from("staff_codes").delete().eq("event_id", ev.id);
await db.from("checkin_log").delete().eq("event_id", ev.id);
await browser.close();
console.log("\n(zkušební data uklizena)");
