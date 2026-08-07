#!/usr/bin/env node
// Založí (nebo aktualizuje) první akci.
//
// Než bude hotová administrace ze třetí fáze, je tohle nejrychlejší způsob,
// jak dostat akci do databáze. Skript je idempotentní, pozná akci podle slugu
// a existující jen přepíše, takže se dá pouštět opakovaně.
//
// Spuštění:  node --env-file=.env scripts/seed-event.mjs

import { createClient } from "@supabase/supabase-js";

const EVENT = {
  slug: "what-the-f3ck-is-heatmapa",
  title: "WHAT THE F3CK IS HEATMA8A",
  perex:
    "Křest aplikace heatmapa. Tři DJs, promo tým Jägermeisteru a jedna noc, po které bude Praha vypadat jinak.",
  description:
    "Spouštíme heatmapu a potichu to rozhodně nebude. V Baru Zvon na Staroměstském náměstí " +
    "se za jeden večer vystřídají tři DJs, na místě bude promo tým našeho partnera Jägermeister " +
    "a ty budeš mezi prvními, kdo si aplikaci osahá naživo.\n\n" +
    "Vstup je zdarma, kapacita je 100 míst. Zaregistruj se, potvrď rezervaci v e-mailu " +
    "a vstupenku s QR kódem pak stačí ukázat u vchodu.",
  cover_url: "/what-the-f3ck-is-heatmapa.jpg",
  // 30. srpna 2026, 20:00 středoevropského letního času.
  starts_at: "2026-08-30T20:00:00+02:00",
  ends_at: "2026-08-31T03:00:00+02:00",
  venue_name: "Bar Zvon",
  venue_address: "Staroměstské náměstí 605/13, 110 00 Praha 1",
  capacity: 100,
  registration_closes_at: "2026-08-30T18:00:00+02:00",
  pending_ttl_minutes: 30,
  is_published: true,
};

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("events")
  .upsert({ ...EVENT, updated_at: new Date().toISOString() }, { onConflict: "slug" })
  .select("id, ref, slug, title, capacity, starts_at")
  .single();

if (error) {
  console.error("Nepovedlo se:", error.message);
  process.exit(1);
}

// Počítadlo se plní triggerem nad rezervacemi, u čerstvé akce tedy ještě
// neexistuje. Doplníme prázdný řádek, aby na něj šlo hned navěsit realtime.
await supabase.rpc("refresh_event_counter", { p_event_id: data.id });

console.log("Akce je v databázi:");
console.table([data]);
console.log(`\nVeřejná adresa bude:  /akce/${data.slug}`);
console.log(`Zkouška API:          curl -s localhost:3000/api/events/${data.slug} | head -c 400\n`);
