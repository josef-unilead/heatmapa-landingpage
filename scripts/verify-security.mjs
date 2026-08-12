#!/usr/bin/env node
// Ověří, co smí anonymní klíč.
//
// Anonymní klíč je veřejný, je zapečený v JavaScriptu webu a přečte si ho
// kdokoli, kdo si otevře zdroj stránky. Tenhle skript se za něj vydává a
// zkouší dělat věci, které by dělat neměl. Pouštěj to po každé změně
// schématu nebo RLS.
//
// Spuštění:  node --env-file=.env scripts/verify-security.mjs

import { createClient } from "@supabase/supabase-js";

const anon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let failures = 0;

function check(popis, prosloTest, detail = "") {
  console.log(`  ${prosloTest ? "✓" : "✗"}  ${popis}${detail ? `   ${detail}` : ""}`);
  if (!prosloTest) failures++;
}

// Připravíme skutečnou rezervaci, na které se dá ověřit, že ji anon nevidí.
const { data: event } = await service
  .from("events").select("id, slug").eq("is_published", true).limit(1).maybeSingle();

if (!event) {
  console.error("V databázi není žádná publikovaná akce. Pusť nejdřív npm run db:seed.");
  process.exit(1);
}

const marker = `verify-${Date.now()}@example.com`;
const { error: seedError } = await service.from("reservations").insert({
  event_id: event.id,
  first_name: "Kontrolní", last_name: "Záznam",
  email: marker, email_normalized: marker, phone_e164: "+420000000001",
  consent_gdpr: true,
  pending_expires_at: new Date(Date.now() + 3600e3).toISOString(),
});
if (seedError) {
  console.error("Nepodařilo se založit kontrolní záznam:", seedError.message);
  process.exit(1);
}

try {
  console.log("\nCo vidí anonymní klíč:\n");

  const reservations = await anon.from("reservations").select("email");
  check(
    "rezervace zůstávají skryté",
    (reservations.data ?? []).length === 0,
    `vráceno ${(reservations.data ?? []).length} řádků`,
  );

  const attempts = await anon.from("signup_attempts").select("ip_hash");
  check("pokusy o registraci zůstávají skryté", (attempts.data ?? []).length === 0);

  const tokens = await anon.from("form_tokens").select("jti");
  check("nonce formulářů zůstávají skryté", (tokens.data ?? []).length === 0);

  const events = await anon.from("events").select("slug");
  check("publikované akce jsou čitelné", (events.data ?? []).length > 0);

  const counters = await anon.from("event_counters").select("taken");
  check("počítadlo je čitelné", (counters.data ?? []).length > 0);

  const availability = await anon.rpc("event_availability", { p_slug: event.slug });
  check("volná místa jdou zjistit", !availability.error,
    availability.data ? JSON.stringify(availability.data) : availability.error?.message);

  console.log("\nCo anonymní klíč nesmí:\n");

  const create = await anon.rpc("create_reservation", {
    p_slug: event.slug, p_first_name: "Bot", p_last_name: "Bot",
    p_email: "bot@example.com", p_email_normalized: "bot@example.com",
    p_phone_e164: "+420000000002", p_lang: "cs", p_consent_marketing: false,
    p_confirm_token_hash: "x", p_ip_hash: null, p_ua_hash: null,
  });
  check("nemůže zakládat rezervace napřímo", Boolean(create.error),
    create.error ? "" : "PROŠLO, obchází to Turnstile i rate limit");

  const confirm = await anon.rpc("confirm_reservation", { p_token_hash: "x" });
  check("nemůže potvrzovat rezervace", Boolean(confirm.error));

  const insert = await anon.from("reservations").insert({
    event_id: event.id, first_name: "a", last_name: "b",
    email: "x@y.cz", email_normalized: "x@y.cz", phone_e164: "+420000000003",
    consent_gdpr: true, pending_expires_at: new Date().toISOString(),
  });
  check("nemůže zapisovat do rezervací", Boolean(insert.error));

  const update = await anon.from("events").update({ capacity: 9999 }).eq("id", event.id);
  const { data: after } = await service.from("events").select("capacity").eq("id", event.id).single();
  check("nemůže měnit kapacitu akce", Boolean(update.error) || after.capacity !== 9999);

  // Pozor na to, jak se RLS projeví: zápis bez policy nevrátí chybu, jen
  // nezmění žádný řádek. Kontrolovat se proto musí hodnota, ne chyba.
  const { data: counterBefore } = await service
    .from("event_counters").select("taken").eq("event_id", event.id).single();
  await anon.from("event_counters").update({ taken: 9999 }).eq("event_id", event.id);
  const { data: counterAfter } = await service
    .from("event_counters").select("taken").eq("event_id", event.id).single();
  check("nemůže přepsat počítadlo", counterBefore.taken === counterAfter.taken,
    `${counterBefore.taken} → ${counterAfter.taken}`);

  const { data: deleteBefore } = await service
    .from("reservations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  await anon.from("reservations").delete().eq("event_id", event.id);
  const { count: afterDelete } = await service
    .from("reservations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  check("nemůže mazat rezervace", (deleteBefore?.length ?? 0) === 0 && afterDelete > 0,
    `zbylo ${afterDelete} rezervací`);

  const migrations = await anon.from("_migrations").select("name");
  check("nevidí evidenci migrací", (migrations.data ?? []).length === 0);

  // Dotazy na podporu chodí přes /api/support, ne přímo do Supabase, takže na
  // tabulce není žádná policy a anonymní klíč do ní nesmí ani zapsat.
  const supportLeak = await anon.from("support_requests").select("*");
  check("nevidí dotazy na podporu", (supportLeak.data ?? []).length === 0);

  const { count: supportBefore } = await service
    .from("support_requests").select("id", { count: "exact", head: true });
  await anon.from("support_requests").insert({
    name: "Bot", email: "bot@example.com", subject: "x", message: "x",
  });
  const { count: supportAfter } = await service
    .from("support_requests").select("id", { count: "exact", head: true });
  check("nemůže zapisovat dotazy na podporu", supportBefore === supportAfter,
    `${supportBefore} → ${supportAfter}`);

  // Starší tabulky formulářů. Zapisovat do nich anonymní klíč smí, tak je
  // web postavený, ale číst je nesmí, jsou v nich jména a e-maily.
  console.log("\nStarší tabulky formulářů:\n");
  for (const table of ["waitlist", "job_applications", "partner_inquiries"]) {
    const { count } = await service.from(table).select("id", { count: "exact", head: true });
    const leak = await anon.from(table).select("*");
    check(`${table} zůstává nečitelná`, (leak.data ?? []).length === 0,
      `v tabulce je ${count ?? "?"} záznamů, anonymnímu klíči se vrátilo ${(leak.data ?? []).length}`);
  }
} finally {
  await service.from("reservations").delete().eq("email", marker);
}

console.log(
  failures
    ? `\nNEPROŠLO: ${failures} kontrol. Tohle se nesmí nasadit.\n`
    : "\nVšechny kontroly prošly.\n",
);
process.exit(failures ? 1 : 0);
