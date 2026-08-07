#!/usr/bin/env node
// Zapne nebo vypne viditelnost akce na webu.
//
// Nepublikovaná akce zmizí z homepage, její stránka vrací 404 a nejde se na
// ni registrovat. Data rezervací zůstávají nedotčená, jde jen o viditelnost.
//
// Spuštění:  node --env-file=.env scripts/toggle-event.mjs <slug> on|off

import { createClient } from "@supabase/supabase-js";

const [slug, state] = process.argv.slice(2);
if (!slug || !["on", "off"].includes(state)) {
  console.error("Použití: node --env-file=.env scripts/toggle-event.mjs <slug> on|off");
  process.exit(1);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await db
  .from("events")
  .update({ is_published: state === "on", updated_at: new Date().toISOString() })
  .eq("slug", slug)
  .select("slug, title, is_published")
  .maybeSingle();

if (error || !data) {
  console.error("Nepovedlo se:", error?.message ?? "akce se nenašla");
  process.exit(1);
}

console.log(`${data.title}: ${data.is_published ? "viditelná na webu" : "skrytá"}`);
