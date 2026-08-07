// Průchod registrací ve dvou prohlížečích naráz.
// Jeden sedí na homepage a nesahá se na něj, druhý se registruje.
// Číslo na prvním musí klesnout samo, bez načtení stránky.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = "tests/e2e/screenshots";
mkdirSync(OUT, { recursive: true });
const EMAIL = process.argv[2] || "delivered@resend.dev";

const browser = await puppeteer.launch({ headless: "shell" });

// ── Prohlížeč A: homepage, na kterou se nesahá ──────────────────────────────
const watcher = await browser.newPage();
await watcher.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await watcher.goto(`${BASE}/`, { waitUntil: "networkidle0" });

const readBadge = () =>
  watcher.evaluate(() => {
    const section = document.querySelector("#akce");
    if (!section) return "SEKCE CHYBÍ";
    const badge = [...section.querySelectorAll("span")]
      .map((el) => el.textContent.trim())
      .find((text) => /Zbývá|obsazená|uzavřená/.test(text));
    return badge ?? "ODZNAK NENALEZEN";
  });

const before = await readBadge();
console.log(`Homepage před registrací:  "${before}"`);
await watcher.screenshot({ path: `${OUT}/e2e-1-homepage.png`, fullPage: false });

// ── Prohlížeč B: registrace ─────────────────────────────────────────────────
const buyer = await browser.newPage();
await buyer.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await buyer.goto(`${BASE}/akce/what-the-f3ck-is-heatmapa`, { waitUntil: "networkidle0" });
await buyer.screenshot({ path: `${OUT}/e2e-2-akce.png`, fullPage: true });

const nadpis = await buyer.$eval("h1", (el) => el.textContent.trim());
console.log(`Stránka akce, nadpis:      "${nadpis}"`);

// Formulář se vyplňuje jako člověk, tedy s pauzou. Server odmítá odeslání
// dřív než 2,5 s po vykreslení.
await buyer.type('input[autocomplete="given-name"]', "Jan");
await buyer.type('input[autocomplete="family-name"]', "Novák");
await buyer.type('input[autocomplete="email"]', EMAIL);
await buyer.type('input[autocomplete="tel"]', "777123456");
await buyer.click('input[type="checkbox"]');

console.log("Čekám na Turnstile...");
await new Promise((r) => setTimeout(r, 4000));

await buyer.screenshot({ path: `${OUT}/e2e-3-vyplneno.png`, fullPage: true });
await buyer.click('button[type="submit"]');

await buyer.waitForFunction(
  () => /Zkontroluj si e-mail|Check your email|pokazilo|obsazená/.test(document.body.innerText),
  { timeout: 20000 },
);
const vysledek = await buyer.evaluate(() => {
  const h = document.querySelector("h3");
  return h ? h.textContent.trim() : document.body.innerText.slice(0, 200);
});
console.log(`Po odeslání:               "${vysledek}"`);
await buyer.screenshot({ path: `${OUT}/e2e-4-odeslano.png`, fullPage: true });

// ── Zpátky k prohlížeči A, pořád bez reloadu ────────────────────────────────
console.log("\nSleduju homepage, na kterou nikdo nesáhl:");
let after = before;
for (let i = 1; i <= 12; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  after = await readBadge();
  console.log(`  po ${String(i * 2).padStart(2)} s: "${after}"`);
  if (after !== before) break;
}

await watcher.screenshot({ path: `${OUT}/e2e-5-homepage-po.png`, fullPage: false });

console.log(
  after !== before
    ? `\n✓ Číslo se změnilo samo: "${before}" → "${after}"`
    : `\n✗ Číslo se nezměnilo, zůstalo "${before}"`,
);

await browser.close();
process.exit(after !== before ? 0 : 1);
