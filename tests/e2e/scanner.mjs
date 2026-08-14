// Průchod celým rozhraním scanneru přes HTTP, tak jak ho uvidí ten, kdo ho
// bude stavět. Zároveň slouží jako živá kontrola, že docs/ticketing-contract.md
// popisuje skutečnost.
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { signTicket } from "../../api/_lib/tokens.js";

const API = process.env.SCANNER_API ?? "http://localhost:3001/api/scanner";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const volej = async (cesta, { method = "GET", token, body } = {}) => {
  const r = await fetch(`${API}/${cesta}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
               ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

// ── Příprava: akce, kód obsluhy, dvě potvrzené vstupenky ────────────────────
const { data: ev } = await db.from("events").select("id, ref, slug")
  .eq("slug", "what-the-f3ck-is-heatmapa").single();

const kod = "TEST42";
await db.from("staff_codes").delete().eq("event_id", ev.id);
await db.from("staff_codes").insert({
  id: randomUUID(), event_id: ev.id, label: "Vchod A", is_active: true,
  code_hash: createHash("sha256").update(kod).digest("hex"),
});

await db.from("reservations").delete().like("email", "scanner-%");
const vstupenky = [];
for (const [i, jmeno] of [["1", "Jan"], ["2", "Petra"]]) {
  const { data } = await db.from("reservations").insert({
    event_id: ev.id, first_name: jmeno, last_name: "Novák",
    email: `scanner-${i}@example.com`, email_normalized: `scanner-${i}@example.com`,
    phone_e164: `+42077712300${i}`, consent_gdpr: true, status: "confirmed",
    pending_expires_at: new Date(Date.now() + 3600e3).toISOString(),
    confirmed_at: new Date().toISOString(),
  }).select("ticket_id").single();
  vstupenky.push(signTicket({ eventRef: ev.ref, ticketId: data.ticket_id }));
}

const vypis = (popis, { status, data }) =>
  console.log(`  ${String(status).padEnd(4)} ${popis.padEnd(38)} ${JSON.stringify(data).slice(0, 110)}`);

console.log("Bez přihlášení:");
vypis("GET  public-key", await volej("public-key"));
vypis("GET  manifest", await volej("manifest"));
vypis("POST checkin", await volej("checkin", { method: "POST", body: { ticket: vstupenky[0] } }));

console.log("\nPřihlášení obsluhy:");
vypis("POST login (špatný kód)", await volej("login", { method: "POST", body: { code: "XXXXXX" } }));
const prihlaseni = await volej("login", { method: "POST", body: { code: kod } });
vypis("POST login (správný kód)", prihlaseni);
const token = prihlaseni.data.token;

console.log("\nOdbavení:");
vypis("POST checkin", await volej("checkin", { method: "POST", token, body: { ticket: vstupenky[0] } }));
vypis("POST checkin (týž sken hned znovu)", await volej("checkin", { method: "POST", token, body: { ticket: vstupenky[0] } }));
vypis("POST checkin (podvržený token)", await volej("checkin", { method: "POST", token, body: { ticket: "AQAB" + "x".repeat(107) } }));
vypis("POST undo", await volej("undo", { method: "POST", token, body: { ticket: vstupenky[0] } }));

console.log("\nOffline:");
const manifest = await volej("manifest", { token });
console.log(`  200  manifest                              ${manifest.data.tickets?.length} vstupenek, akce ${manifest.data.event?.slug}`);
vypis("POST sync (dávka)", await volej("sync", { method: "POST", token, body: {
  checkins: [
    { ticket: vstupenky[1], scannedAt: new Date(Date.now() - 600e3).toISOString() },
    { ticket: vstupenky[1], scannedAt: new Date(Date.now() - 500e3).toISOString() },
  ],
}}));

console.log("\nHledání a ruční odbavení:");
const nalez = await volej("search?q=Novák", { token });
vypis("GET  search?q=Novák", nalez);

await db.from("reservations").delete().like("email", "scanner-%");
await db.from("staff_codes").delete().eq("event_id", ev.id);
console.log("\n(zkušební data uklizena)");
