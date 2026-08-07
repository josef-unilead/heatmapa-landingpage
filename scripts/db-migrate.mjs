#!/usr/bin/env node
// Pustí SQL migrace z supabase/migrations proti databázi.
//
// Migrace jsou psané idempotentně, takže opakované spuštění nevadí. Skript si
// stejně vede tabulku _migrations, ať je vidět, co kdy proběhlo.
//
// Spuštění:  node --env-file=.env scripts/db-migrate.mjs
// Vyžaduje:  SUPABASE_DB_URL (Supabase → Project Settings → Database →
//            Connection string → URI, v režimu Session pooler)

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");
const url = process.env.SUPABASE_DB_URL;

if (!url) {
  console.error(`
Chybí SUPABASE_DB_URL.

Kde ji vzít:
  1. https://supabase.com/dashboard → tvůj projekt
  2. Project Settings → Database → Connection string
  3. Vyber záložku URI a režim "Session pooler"
  4. Zkopíruj řetězec a nahraď [YOUR-PASSWORD] heslem k databázi
  5. Přidej do .env jako SUPABASE_DB_URL="postgresql://..."

Alternativa bez téhle proměnné: obsah souborů ze supabase/migrations
vlož ručně do SQL editoru v Supabase a spusť tlačítkem Run.
`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await sql`
    create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;

  const applied = new Set(
    (await sql`select name from public._migrations`).map((r) => r.name),
  );
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  přeskakuji  ${file} (už proběhla)`);
      continue;
    }
    process.stdout.write(`  pouštím     ${file} ... `);
    await sql.unsafe(readFileSync(join(DIR, file), "utf8"));
    await sql`insert into public._migrations (name) values (${file})
              on conflict (name) do nothing`;
    console.log("hotovo");
    ran++;
  }

  console.log(ran ? `\nHotovo, proběhlo ${ran} migrací.` : "\nDatabáze je aktuální.");
} catch (err) {
  console.error("\nMigrace spadla:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
