#!/usr/bin/env node
// Zkušební akce na projití celého průchodu.
//
// Má vlastní malou kapacitu, takže registrace při zkoušení nesahá na místa
// ostré akce. Na homepage se neobjeví, dostane se na ni jen ten, kdo zná
// adresu. Databáze je jenom jedna, takže i tahle akce je "ostrá" v tom
// smyslu, že se do ní opravdu zapisuje a e-maily opravdu chodí.
//
// Spuštění:
//   node --env-file=.env scripts/seed-test-event.mjs          založí
//   node --env-file=.env scripts/seed-test-event.mjs --clean  smaže i s rezervacemi

import { createClient } from "@supabase/supabase-js";

const SLUG = "zkouska-pruchodu";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

if (process.argv.includes("--clean")) {
  const { data: event } = await db.from("events").select("id").eq("slug", SLUG).maybeSingle();
  if (event) {
    const { count } = await db
      .from("reservations").select("id", { count: "exact", head: true }).eq("event_id", event.id);

    // Chybu je potřeba opravdu přečíst. Bez toho skript hlásil úspěch,
    // i když mazání spadlo na cizí klíč, a člověk zůstal s pocitem uklizeno.
    const { error } = await db.from("events").delete().eq("id", event.id); // rezervace padají s ní
    if (error) {
      console.error("Smazání selhalo:", error.message);
      process.exit(1);
    }
    console.log(`Zkušební akce smazána i s ${count ?? 0} rezervacemi.`);
  } else {
    console.log("Zkušební akce v databázi není.");
  }
  process.exit(0);
}

const { data, error } = await db
  .from("events")
  .upsert({
    slug: SLUG,
    title: "Zkouška průchodu",
    perex: "Zkušební akce. Slouží k vyzkoušení registrace, nikam se nelinkuje.",
    description:
      "Tahle akce existuje jen proto, aby šlo projít celou cestu od formuláře " +
      "po vstupenku, aniž by to ubíralo místa ostré akci.",
    cover_url: "/what-the-f3ck-is-heatmapa.jpg",
    starts_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    venue_name: "Bar Zvon",
    venue_address: "Staroměstské náměstí 605/13, 110 00 Praha 1",
    capacity: 5,
    registration_closes_at: null,
    pending_ttl_minutes: 30,
    is_published: true,
    show_on_homepage: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "slug" })
  .select("id, slug, capacity")
  .single();

if (error) {
  console.error("Nepovedlo se:", error.message);
  process.exit(1);
}

await db.rpc("refresh_event_counter", { p_event_id: data.id });

const site = process.env.PUBLIC_SITE_URL || "http://localhost:5173";
console.log(`Zkušební akce je připravená, kapacita ${data.capacity}.\n`);
console.log(`  ${site}/akce/${data.slug}\n`);
console.log("Na homepage se neukáže. Až budeš hotový, smaž ji i s rezervacemi:");
console.log("  npm run test:event:clean");
