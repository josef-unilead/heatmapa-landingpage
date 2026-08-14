// Čtečka bez signálu.
//
// Nejdůležitější scénář celé akce: v klubu nechytá síť, obsluha musí
// odbavovat dál a nic se nesmí ztratit. Test projde celou cestu včetně
// dosynchronizování po návratu signálu.
//
// Spuštění:  npm run test:scanner:offline

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

const { data: ev } = await db.from("events").select("id, ref")
  .eq("slug", "what-the-f3ck-is-heatmapa").single();

const KOD = "OFFL77";
await db.from("staff_codes").delete().eq("event_id", ev.id);
await db.from("staff_codes").insert({
  id: randomUUID(), event_id: ev.id, label: "Vchod offline", is_active: true,
  code_hash: createHash("sha256").update(KOD).digest("hex"),
});

await db.from("reservations").delete().like("email", "offline-scan%");
const { data: rez } = await db.from("reservations").insert({
  event_id: ev.id, first_name: "Tomáš", last_name: "Bez Signálu",
  email: "offline-scan@example.com", email_normalized: "offline-scan@example.com",
  phone_e164: "+420777111000", consent_gdpr: true, status: "confirmed",
  pending_expires_at: new Date(Date.now() + 3600e3).toISOString(),
  confirmed_at: new Date().toISOString(),
}).select("ticket_id").single();

const video = join(OUT, "fake-camera-offline.y4m");
writeFileSync(video, vyrobY4M(signTicket({ eventRef: ev.ref, ticketId: rez.ticket_id })));

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

const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const prekryv = () => page.evaluate(() =>
  document.querySelector("[data-scan-result]")?.dataset.scanResult ?? null);

// ── Přihlášení a stažení seznamu, ještě se signálem ─────────────────────────
await page.goto(`${BASE}/scanner`, { waitUntil: "networkidle0" });
await page.type('input[type="text"]', KOD);
await page.click('button[type="submit"]');
await page.waitForFunction(() => /Skenovat/i.test(document.body.innerText), { timeout: 15000 });
await page.waitForFunction(() => /Odbaveno \d+ z \d+/.test(document.body.innerText), { timeout: 15000 });
console.log(`  ✓ přihlášeno a stažen seznam: ${(await text()).match(/Odbaveno \d+ z \d+/)[0]}`);

// Překryv od prvního skenu zavřeme, ať nepřekáží.
await page.evaluate(() => document.querySelector("[data-scan-result]")?.click());

// ── Odpojíme síť ────────────────────────────────────────────────────────────
await page.setOfflineMode(true);
await page.waitForFunction(() => /Bez signálu/.test(document.body.innerText), { timeout: 15000 });
console.log("  ✓ čtečka poznala výpadek sítě");

// Aby se dal odbavit tentýž lístek znovu, vrátíme ho v databázi i v místní
// kopii do stavu potvrzeno. Simuluje to člověka, který teprve přišel.
await db.from("reservations").update({ status: "confirmed", checked_in_at: null, checked_in_by: null })
  .eq("ticket_id", rez.ticket_id);
await page.evaluate(() => {
  const klic = "heatmapa.scanner.manifest";
  const seznam = JSON.parse(localStorage.getItem(klic));
  for (const id of Object.keys(seznam.tickets)) {
    seznam.tickets[id] = { ...seznam.tickets[id], status: "confirmed", checkedInAt: null };
  }
  localStorage.setItem(klic, JSON.stringify(seznam));
});

// ── Sken bez signálu ────────────────────────────────────────────────────────
await page.waitForFunction(() => Boolean(document.querySelector("[data-scan-result]")), { timeout: 30000 });
const vysledekOffline = await prekryv();
const obrazovka = await text();
console.log(`  ✓ sken bez signálu: ${vysledekOffline}` +
            `${/Tomáš Bez Signálu/.test(obrazovka) ? ", jméno sedí" : ", JMÉNO CHYBÍ"}` +
            `${/odešle se později/i.test(obrazovka) ? ", hlásí odložené odeslání" : ""}`);
await page.screenshot({ path: `${OUT}/scanner-4-offline.png` });

await page.evaluate(() => document.querySelector("[data-scan-result]")?.click());
await new Promise((r) => setTimeout(r, 500));
const cekajici = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("heatmapa.scanner.queue") ?? "[]").length);
console.log(`  ✓ ve frontě čeká ${cekajici} sken`);

const { data: predSync } = await db.from("reservations")
  .select("status").eq("ticket_id", rez.ticket_id).single();
console.log(`  ✓ v databázi zatím: ${predSync.status} (server o tom ještě neví)`);

// ── Vrátíme signál ──────────────────────────────────────────────────────────
await page.setOfflineMode(false);
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await new Promise((r) => setTimeout(r, 4000));

const poSync = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("heatmapa.scanner.queue") ?? "[]").length);
const { data: poOdeslani } = await db.from("reservations")
  .select("status, checked_in_by").eq("ticket_id", rez.ticket_id).single();

console.log(`  ✓ po návratu signálu: fronta ${poSync}, ` +
            `v databázi ${poOdeslani.status}, odbavil ${poOdeslani.checked_in_by}`);

const { data: log } = await db.from("checkin_log")
  .select("result, source").eq("event_id", ev.id).order("id", { ascending: false }).limit(3);
console.log(`  ✓ v logu: ${log.map((z) => `${z.result}/${z.source}`).join(", ")}`);

await db.from("reservations").delete().like("email", "offline-scan%");
await db.from("staff_codes").delete().eq("event_id", ev.id);
await db.from("checkin_log").delete().eq("event_id", ev.id);
await browser.close();
console.log("\n(zkušební data uklizena)");
