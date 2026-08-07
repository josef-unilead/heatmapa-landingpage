#!/usr/bin/env node
// Pojistka proti úniku serverových klíčů do veřejného webu.
//
// Vite zapéká do bundlu jen proměnné s prefixem VITE_, takže by se tam nic
// tajného dostat nemělo. Stačí ale jednou omylem napsat VITE_ před název
// serverové proměnné, nebo klíč natvrdo do zdrojáku, a je venku pro každého,
// kdo si otevře zdroj stránky. Tohle běží po každém buildu a shodí ho.
//
// Spuštění:  node --env-file=.env scripts/check-bundle-secrets.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Proměnné, které ve veřejném buildu nikdy nesmí být.
const FORBIDDEN_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "TICKET_SIGNING_PRIVATE_KEY",
  "FORM_TOKEN_SECRET",
  "SESSION_SECRET",
  "IP_HASH_SALT",
  "CRON_SECRET",
  "ADMIN_PASSWORD",
];

// Tvary klíčů, které poznáme i bez toho, aby byly v prostředí.
const FORBIDDEN_PATTERNS = [
  [/\bre_[A-Za-z0-9_]{20,}/, "API klíč Resendu"],
  [/postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/, "připojovací řetězec s heslem"],
  [/"role"\s*:\s*"service_role"/, "service role JWT"],
];

// Schválně bez glob: readdirSync s recursive je v nodu dýl a nechci, aby
// build spadl kvůli tomu, jakou verzi nodu má zrovna Vercel nastavenou.
const files = readdirSync("dist", { recursive: true })
  .map((name) => join("dist", String(name)))
  .filter((path) => /\.(js|css|html)$/.test(path));

if (files.length === 0) {
  console.error("V dist/ nic není. Nejdřív pusť build.");
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");

  for (const name of FORBIDDEN_VARS) {
    const value = process.env[name];
    // Krátké hodnoty přeskakujeme, náhodná shoda by dělala falešné poplachy.
    if (value && value.length >= 12 && content.includes(value)) {
      findings.push(`${file}: obsahuje hodnotu ${name}`);
    }
    if (content.includes(`VITE_${name}`)) {
      findings.push(`${file}: odkazuje na VITE_${name}, což by ji zveřejnilo`);
    }
  }

  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) findings.push(`${file}: vypadá to na ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Naopak: tohle v buildu být musí.
//
// Chybějící VITE_ proměnná se nikde neprojeví jako chyba. Vite za ni dosadí
// undefined, kód se zjednoduší a minifikátor mrtvou větev zahodí. Widget se
// pak prostě nevykreslí a registrace tiše přestane fungovat pro všechny,
// protože server bez ověřené výzvy nikoho nepustí. Radši ať spadne build.
// ---------------------------------------------------------------------------
const REQUIRED_IN_BUNDLE = [
  ["challenges.cloudflare.com", "VITE_TURNSTILE_SITE", "ověření Turnstile ve formuláři"],
];

const bundle = files
  .filter((path) => path.endsWith(".js"))
  .map((path) => readFileSync(path, "utf8"))
  .join("");

for (const [needle, variable, what] of REQUIRED_IN_BUNDLE) {
  if (!bundle.includes(needle)) {
    findings.push(
      `v buildu chybí ${what}. Skoro jistě není nastavená proměnná ${variable}. ` +
      `Bez ní se widget nevykreslí a nikdo se nezaregistruje.`,
    );
  }
}

if (findings.length) {
  console.error("\nV klientském buildu je něco, co tam nepatří:\n");
  for (const f of findings) console.error("  " + f);
  console.error("\nBuild zastaven. Nic takového se nesmí nasadit.\n");
  process.exit(1);
}

console.log(`Kontrola bundlu v pořádku, prošlo ${files.length} souborů.`);
