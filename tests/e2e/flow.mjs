// Zbytek průchodu: potvrzení, vstupenka, offline režim, plná kapacita.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:5173";
const OUT = "tests/e2e/screenshots";
mkdirSync(OUT, { recursive: true });
const SLUG = "what-the-f3ck-is-heatmapa";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Potvrzovací odkaz z e-mailu neumím přečíst, v databázi je jen jeho otisk.
// Vyrobím si proto vlastní token a jeho otisk zapíšu k rezervaci. Zbytek
// cesty už jde přes ostrý endpoint i ostrou stránku.
const { data: res } = await db
  .from("reservations").select("id, email").eq("status", "pending")
  .order("created_at", { ascending: false }).limit(1).maybeSingle();

if (!res) { console.error("Není žádná nepotvrzená rezervace."); process.exit(1); }

const token = randomBytes(32).toString("base64url");
await db.from("reservations").update({
  confirm_token_hash: createHash("sha256").update(token).digest("hex"),
  confirm_expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
}).eq("id", res.id);

const browser = await puppeteer.launch({ headless: "shell" });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

// ── Potvrzení ───────────────────────────────────────────────────────────────
await page.goto(`${BASE}/rezervace/potvrdit?t=${token}`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => !/Potvrzuji/.test(document.body.innerText), { timeout: 20000 });
console.log("Potvrzení:", (await page.$eval("h1", (el) => el.textContent.trim())));
await page.screenshot({ path: `${OUT}/e2e-6-potvrzeno.png` });

// ── Vstupenka ───────────────────────────────────────────────────────────────
await page.click('a[href^="/t/"]');
await page.waitForSelector("img[alt]", { timeout: 15000 });
await new Promise((r) => setTimeout(r, 1500));

const ticketUrl = page.url();
const info = await page.evaluate(() => {
  const qr = [...document.querySelectorAll("img")].find((i) => i.src.startsWith("data:image"));
  return {
    maQr: Boolean(qr),
    velikostQr: qr ? qr.naturalWidth : 0,
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 220),
  };
});
console.log(`Vstupenka: QR ${info.maQr ? `vykreslen ${info.velikostQr}px` : "CHYBÍ"}`);
console.log(`           ${info.text}`);
await page.screenshot({ path: `${OUT}/e2e-7-vstupenka.png`, fullPage: true });

// ── Offline ─────────────────────────────────────────────────────────────────
// Service worker se registruje při první návštěvě, dáme mu chvíli.
await new Promise((r) => setTimeout(r, 2000));
const swReady = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration("/t/");
  return Boolean(reg?.active);
});
console.log(`\nService worker aktivní: ${swReady ? "ano" : "ne"}`);

await page.setOfflineMode(true);
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await new Promise((r) => setTimeout(r, 2500));

const offline = await page.evaluate(() => {
  const qr = [...document.querySelectorAll("img")].find((i) => i.src.startsWith("data:image"));
  return { maQr: Boolean(qr), text: document.body.innerText.replace(/\s+/g, " ").slice(0, 160) };
});
console.log(`Bez sítě:  QR ${offline.maQr ? "vykreslen ✓" : "CHYBÍ ✗"}`);
console.log(`           ${offline.text}`);
await page.screenshot({ path: `${OUT}/e2e-8-offline.png`, fullPage: true });
await page.setOfflineMode(false);

// ── Plná kapacita ───────────────────────────────────────────────────────────
const { data: ev } = await db.from("events").select("id, capacity").eq("slug", SLUG).single();
const { data: avail } = await db.rpc("event_availability", { p_slug: SLUG });
await db.from("events").update({ capacity: avail.taken }).eq("id", ev.id);
console.log(`\nKapacitu jsem dočasně snížil na ${avail.taken} (= obsazeno), aby byla akce plná.`);

const full = await browser.newPage();
await full.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await full.goto(`${BASE}/akce/${SLUG}`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1500));

const stav = await full.evaluate(() => ({
  maFormular: Boolean(document.querySelector('input[autocomplete="email"]')),
  maTlacitko: Boolean(document.querySelector('button[type="submit"]')),
  text: document.body.innerText.replace(/\s+/g, " "),
}));
console.log(`Formulář na stránce: ${stav.maFormular ? "JE ✗" : "není ✓"}`);
console.log(`Tlačítko odeslat:    ${stav.maTlacitko ? "JE ✗" : "není ✓"}`);
console.log(`Hláška obsazeno:     ${/Všechna místa jsou obsazená/.test(stav.text) ? "ano ✓" : "NENÍ ✗"}`);
await full.screenshot({ path: `${OUT}/e2e-9-obsazeno.png`, fullPage: true });

// Kapacitu vrátíme zpátky.
await db.from("events").update({ capacity: ev.capacity }).eq("id", ev.id);
console.log(`Kapacita vrácena na ${ev.capacity}.`);

console.log(`\nAdresa vstupenky: ${ticketUrl}`);
await browser.close();
