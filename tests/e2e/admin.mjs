// Průchod administrací: přihlášení, přehled, akce nad rezervací, export, kódy.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = "tests/e2e/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: "shell" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });

// ── Bez přihlášení nesmí API nic vydat ──────────────────────────────────────
const bezPrihlaseni = await page.evaluate(() => 0).then(() =>
  fetch(`${BASE}/api/admin/reservations?event=what-the-f3ck-is-heatmapa`).then((r) => r.status));
console.log(`Bez přihlášení vrací API: HTTP ${bezPrihlaseni} ${bezPrihlaseni === 401 ? "✓" : "✗"}`);

// ── Špatné heslo ────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await page.type('input[type="password"]', "rozhodne-spatne-heslo");
await page.click('button[type="submit"]');
await page.waitForFunction(() => /špatné heslo/i.test(document.body.innerText), { timeout: 10000 });
console.log("Špatné heslo odmítnuto ✓");

// ── Správné heslo ───────────────────────────────────────────────────────────
// Načtení stránky znovu je spolehlivější než mazat pole. Přepsání hodnoty
// přímo v DOM React nezachytí a odeslalo by se pořád to staré heslo.
await page.reload({ waitUntil: "networkidle0" });
await page.type('input[type="password"]', process.env.ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForFunction(() => /volná místa/i.test(document.body.innerText), { timeout: 15000 });
console.log("Přihlášení prošlo ✓");

await new Promise((r) => setTimeout(r, 2000));

const prehled = await page.evaluate(() => {
  const cisla = [...document.querySelectorAll("p")]
    .filter((p) => /uppercase/.test(p.className))
    .map((p) => `${p.textContent.trim()}=${p.nextElementSibling?.textContent.trim()}`);
  return {
    cisla,
    radkuVTabulce: document.querySelectorAll("tbody tr").length,
    maGraf: Boolean(document.querySelector("svg[role='img']")),
    sloupcuVGrafu: document.querySelectorAll("svg[role='img'] rect[rx='4']").length,
  };
});
console.log("Přehledová čísla:", prehled.cisla.join(", "));
console.log(`Řádků v tabulce: ${prehled.radkuVTabulce}`);
console.log(`Graf: ${prehled.maGraf ? "vykreslen" : "CHYBÍ"}, sloupců ${prehled.sloupcuVGrafu}`);
await page.screenshot({ path: `${OUT}/admin-prehled.png`, fullPage: true });

// ── CSV export ──────────────────────────────────────────────────────────────
const csv = await page.evaluate(async () => {
  const r = await fetch("/api/admin/export?event=what-the-f3ck-is-heatmapa", { credentials: "same-origin" });
  return { status: r.status, typ: r.headers.get("content-type"), text: (await r.text()).slice(0, 160) };
});
console.log(`\nCSV: HTTP ${csv.status}, ${csv.typ}`);
console.log("  " + csv.text.split("\r\n").slice(0, 2).join("\n  "));

// ── Kódy obsluhy ────────────────────────────────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Kódy obsluhy")?.click();
});
await new Promise((r) => setTimeout(r, 1200));
await page.type('input[type="text"]', "Vchod");
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => /Vytvořit kód/.test(b.textContent))?.click();
});
await page.waitForFunction(() => /opiš si ho teď/i.test(document.body.innerText), { timeout: 10000 });
const kod = await page.evaluate(() => document.querySelector("code")?.textContent);
console.log(`\nVytvořený kód obsluhy: ${kod} (${kod?.length} znaků) ${/^[A-Z2-9]{6}$/.test(kod) ? "✓" : "✗"}`);
await page.screenshot({ path: `${OUT}/admin-kody.png` });

await browser.close();
