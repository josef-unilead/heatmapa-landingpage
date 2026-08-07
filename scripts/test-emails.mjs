#!/usr/bin/env node
// Pošle oba e-maily na zadanou adresu, ať jde zkontrolovat, jak vypadají
// ve skutečné schránce. Bere ostré šablony a ostrá data akce z databáze,
// takže se testuje přesně to, co dostanou návštěvníci.
//
// Spuštění:  node --env-file=.env scripts/test-emails.mjs adresa@example.com
//
// Volitelně druhým parametrem slug akce, jinak se vezme první publikovaná.

import { createClient } from "@supabase/supabase-js";
import { sendConfirmationEmail, sendTicketEmail } from "../api/_lib/email.js";
import { ticketQrPng } from "../api/_lib/qr.js";
import { signTicket, createConfirmToken } from "../api/_lib/tokens.js";

const to = process.argv[2];
const slug = process.argv[3];

if (!to) {
  console.error("Použití: node --env-file=.env scripts/test-emails.mjs adresa@example.com [slug]");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let query = supabase.from("events").select("*").eq("is_published", true);
query = slug ? query.eq("slug", slug) : query.order("starts_at").limit(1);
const { data: event, error } = await query.maybeSingle();

if (error || !event) {
  console.error("Akce se nenašla:", error?.message ?? "žádná publikovaná akce");
  process.exit(1);
}

const site = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
const confirm = createConfirmToken();
const ticketToken = signTicket({
  eventRef: event.ref,
  ticketId: "3f8a1c2e-4b5d-4e6f-8a9b-0c1d2e3f4a5b",
});
const ticketUrl = `${site}/t/${ticketToken}`;

console.log(`Akce:      ${event.title}`);
console.log(`Adresát:   ${to}`);
console.log(`Odesílatel:${process.env.EMAIL_FROM}`);
console.log(`Odkazy na: ${site}\n`);

await sendConfirmationEmail({
  to, lang: "cs", firstName: "Josefe", event,
  confirmUrl: `${site}/rezervace/potvrdit?t=${confirm.token}`,
});
console.log("  ✓ odeslán potvrzovací e-mail");

await sendTicketEmail({
  to, lang: "cs", firstName: "Josef", lastName: "Drahota", event,
  ticketUrl, cancelUrl: `${ticketUrl}?akce=zrusit`,
  qrPng: await ticketQrPng(ticketToken),
});
console.log("  ✓ odeslán e-mail se vstupenkou");

console.log("\nQR ve vstupence obsahuje tenhle token:");
console.log("  " + ticketToken);
