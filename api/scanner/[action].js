// Server pro scanner u vchodu.
//
// Rozhraní scanneru je samostatná aplikace, tohle je jen jeho zázemí. Popis
// pro toho, kdo ho bude stavět, je v docs/ticketing-contract.md.
//
// Cesty jsou jednoúrovňové. Vercel u projektů, které nejsou Next.js,
// zachytávací cestu [...path] v /api nesměruje.
//
//   GET  public-key            veřejný klíč na ověření podpisu (bez přihlášení)
//   POST login                 { code }        přihlášení obsluhy na 12 hodin
//   GET  me                    ověření platnosti relace
//   POST checkin               { ticket }      odbavení
//   POST undo                  { ticket }      vzetí zpět do 30 s
//   GET  manifest              seznam potvrzených vstupenek pro offline
//   POST sync                  { checkins }    dávka odbavení z offline režimu
//   GET  search?q=             hledání podle příjmení nebo e-mailu
//   POST manual                { reservationId } ruční odbavení bez QR

import { db, rpc } from "../_lib/db.js";
import { json, methodGuard, readBody, withErrorHandling } from "../_lib/http.js";
import { publicKeyBase64, verifyTicket, TICKET_TOKEN_VERSION } from "../_lib/tokens.js";
import { hashStaffCode, issueStaffToken, staffFromRequest } from "../_lib/staff.js";

const UNDO_WINDOW_SECONDS = 30;
const IDEMPOTENCY_SECONDS = 5;
const MAX_SYNC_BATCH = 500;

// ---------------------------------------------------------------------------
// Veřejný klíč
//
// Schválně bez přihlášení: je veřejný a scanner ho potřebuje ještě než se
// obsluha přihlásí, aby uměl ověřovat podpisy i offline. Vyrábět vstupenky
// se s ním nedá, k tomu je potřeba klíč privátní, který server neopouští.
// ---------------------------------------------------------------------------
function publicKey(req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  return json(res, 200, {
    ok: true,
    algorithm: "Ed25519",
    format: "raw-32-byte-base64",
    tokenVersion: TICKET_TOKEN_VERSION,
    publicKey: publicKeyBase64(),
  });
}

// ---------------------------------------------------------------------------
// Přihlášení obsluhy
// ---------------------------------------------------------------------------
async function login(req, res) {
  const code = String(readBody(req).code ?? "").trim().toUpperCase();
  if (code.length < 4) return json(res, 400, { ok: false, error: "bad_code" });

  const { data: staff, error } = await db()
    .from("staff_codes")
    .select("id, label, event_id, expires_at, events!inner(id, ref, slug, title, starts_at, venue_name)")
    .eq("code_hash", hashStaffCode(code))
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  // Stejná odpověď na neexistující i zneplatněný kód, ať nejde zkoušením
  // zjistit, které kódy kdy platily.
  if (!staff) return json(res, 401, { ok: false, error: "invalid_code" });
  if (staff.expires_at && new Date(staff.expires_at) < new Date()) {
    return json(res, 401, { ok: false, error: "invalid_code" });
  }

  const token = issueStaffToken({
    eventId: staff.events.id,
    eventRef: staff.events.ref,
    staffCodeId: staff.id,
    label: staff.label,
  });

  return json(res, 200, {
    ok: true,
    token,
    staff: { label: staff.label },
    event: {
      slug: staff.events.slug,
      title: staff.events.title,
      startsAt: staff.events.starts_at,
      venueName: staff.events.venue_name,
    },
  });
}

// ---------------------------------------------------------------------------
// Odbavení
// ---------------------------------------------------------------------------
async function checkIn(req, res, staff) {
  const body = readBody(req);
  const parsed = verifyTicket(body.ticket);

  // Podpis nesedí. Buď je to podvrh, nebo poškozený sken. Do databáze se
  // kvůli tomu vůbec nechodí.
  if (!parsed) {
    await db().from("checkin_log").insert({
      event_id: staff.eventId, result: "invalid_signature",
      staff_code_id: staff.staffCodeId, staff_label: staff.label, source: "online",
    });
    return json(res, 200, { ok: false, result: "invalid_signature" });
  }

  const result = await rpc("check_in_ticket", {
    p_ticket_id: parsed.ticketId,
    p_event_ref: parsed.eventRef,
    p_staff_code_id: staff.staffCodeId,
    p_staff_label: staff.label,
    p_source: "online",
    p_scanned_at: new Date().toISOString(),
    p_idem_seconds: IDEMPOTENCY_SECONDS,
  });

  return json(res, 200, result);
}

async function undo(req, res, staff) {
  const parsed = verifyTicket(readBody(req).ticket);
  if (!parsed) return json(res, 200, { ok: false, result: "invalid_signature" });

  const result = await rpc("undo_check_in", {
    p_ticket_id: parsed.ticketId,
    p_staff_code_id: staff.staffCodeId,
    p_staff_label: staff.label,
    p_window_secs: UNDO_WINDOW_SECONDS,
  });

  return json(res, 200, result);
}

// ---------------------------------------------------------------------------
// Offline seznam
//
// Scanner si ho stáhne, dokud má signál, a u dveří pak umí odbavovat bez sítě.
// Jsou v něm jen potvrzené a už odbavené vstupenky, tedy ty, které můžou
// dorazit. Osobní údaje jsou omezené na to, co obsluha u dveří potřebuje.
// ---------------------------------------------------------------------------
async function manifest(req, res, staff) {
  const { data, error } = await db()
    .from("reservations")
    .select("ticket_id, first_name, last_name, status, checked_in_at")
    .eq("event_id", staff.eventId)
    .in("status", ["confirmed", "checked_in"])
    .order("last_name");
  if (error) throw new Error(error.message);

  const { data: event } = await db()
    .from("events").select("ref, slug, title, starts_at, capacity").eq("id", staff.eventId).single();

  res.setHeader("Cache-Control", "no-store");
  return json(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    event,
    tickets: data.map((r) => ({
      ticketId: r.ticket_id,
      firstName: r.first_name,
      lastName: r.last_name,
      status: r.status,
      checkedInAt: r.checked_in_at,
    })),
  });
}

// ---------------------------------------------------------------------------
// Dávka odbavení z offline režimu
//
// Scanner posílá, co naskenoval bez signálu, i s časem skenu. Server je
// zpracuje jedno po druhém stejnou funkcí jako online odbavení, takže platí
// stejná pravidla, a vrátí, co neprošlo. Konflikt tu není chyba, ale běžný
// stav: dva scannery bez sítě mohly pustit tutéž vstupenku a někdo to musí
// rozseknout. Rozhoduje ten, kdo dorazil na server první.
// ---------------------------------------------------------------------------
async function sync(req, res, staff) {
  const items = readBody(req).checkins;
  if (!Array.isArray(items)) return json(res, 400, { ok: false, error: "bad_request" });
  if (items.length > MAX_SYNC_BATCH) return json(res, 413, { ok: false, error: "batch_too_large" });

  const results = [];
  for (const item of items) {
    const parsed = verifyTicket(item.ticket);
    if (!parsed) {
      results.push({ ticket: item.ticket, ok: false, result: "invalid_signature" });
      continue;
    }
    const result = await rpc("check_in_ticket", {
      p_ticket_id: parsed.ticketId,
      p_event_ref: parsed.eventRef,
      p_staff_code_id: staff.staffCodeId,
      p_staff_label: staff.label,
      p_source: "offline",
      p_scanned_at: item.scannedAt ?? new Date().toISOString(),
      // Offline dávka se posílá se zpožděním, takže krátké okno na opakovaný
      // sken nedává smysl. Duplicita v dávce je skutečný konflikt.
      p_idem_seconds: 0,
    });
    results.push({ ticket: item.ticket, ...result });
  }

  return json(res, 200, {
    ok: true,
    accepted: results.filter((r) => r.ok).length,
    conflicts: results.filter((r) => !r.ok),
  });
}

// ---------------------------------------------------------------------------
// Hledání a ruční odbavení
//
// Na případ, kdy člověk vstupenku nemá po ruce: vybitý telefon, smazaný
// e-mail, nebo prostě nenajde. Obsluha ho najde podle příjmení a odbaví.
// ---------------------------------------------------------------------------
async function search(req, res, staff) {
  const query = String(req.query.q ?? "").trim();
  if (query.length < 2) return json(res, 200, { ok: true, results: [] });

  const safe = query.replaceAll("%", "").replaceAll(",", " ");
  const { data, error } = await db()
    .from("reservations")
    .select("id, ticket_id, first_name, last_name, email, status, checked_in_at")
    .eq("event_id", staff.eventId)
    .or(`last_name.ilike.%${safe}%,first_name.ilike.%${safe}%,email.ilike.%${safe}%`)
    .in("status", ["confirmed", "checked_in"])
    .order("last_name")
    .limit(20);
  if (error) throw new Error(error.message);

  return json(res, 200, {
    ok: true,
    results: data.map((r) => ({
      reservationId: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      // Adresa jen naznačená, ať se dá rozlišit shoda jmen, ale nedá se
      // seznam účastníků odčerpat hledáním.
      emailHint: r.email.replace(/^(.).*(@.*)$/, "$1***$2"),
      status: r.status,
      checkedInAt: r.checked_in_at,
    })),
  });
}

async function manual(req, res, staff) {
  const { reservationId } = readBody(req);
  if (!reservationId) return json(res, 400, { ok: false, error: "bad_request" });

  const { data: reservation } = await db()
    .from("reservations")
    .select("ticket_id, event_id, events!inner(ref)")
    .eq("id", reservationId)
    .eq("event_id", staff.eventId)
    .maybeSingle();

  if (!reservation) return json(res, 404, { ok: false, result: "not_found" });

  const result = await rpc("check_in_ticket", {
    p_ticket_id: reservation.ticket_id,
    p_event_ref: reservation.events.ref,
    p_staff_code_id: staff.staffCodeId,
    p_staff_label: staff.label,
    p_source: "manual",
    p_scanned_at: new Date().toISOString(),
    p_idem_seconds: IDEMPOTENCY_SECONDS,
  });

  return json(res, 200, result);
}

// ---------------------------------------------------------------------------
const ROUTES = {
  "GET public-key": { handler: publicKey, public: true },
  "POST login": { handler: login, public: true },
  "GET me": { handler: (req, res, staff) => json(res, 200, { ok: true, staff }) },
  "POST checkin": { handler: checkIn },
  "POST undo": { handler: undo },
  "GET manifest": { handler: manifest },
  "POST sync": { handler: sync },
  "GET search": { handler: search },
  "POST manual": { handler: manual },
};

async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST"])) return;

  const route = ROUTES[`${req.method} ${req.query.action ?? ""}`];
  if (!route) return json(res, 404, { ok: false, error: "not_found" });

  if (route.public) return route.handler(req, res);

  const staff = staffFromRequest(req);
  if (!staff) return json(res, 401, { ok: false, error: "unauthorized" });

  await route.handler(req, res, staff);
}

export default withErrorHandling(handler);
