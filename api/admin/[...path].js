// Administrace guestlistu.
//
// Jedno heslo, žádné účty. Po přihlášení drží prohlížeč podepsanou cookie,
// kterou nejde přečíst z JavaScriptu.
//
// Všechno je v jednom souboru, protože Vercel na free tarifu povoluje dvanáct
// serverových funkcí na nasazení a scanner ve čtvrté fázi si vezme svoje.
//
// Cesty:
//   POST   login                 { password }
//   POST   logout
//   GET    session
//   GET    events
//   POST   events                { ...akce }         založí nebo přepíše
//   POST   events/delete         { id }
//   POST   upload                { filename, dataUrl }
//   GET    reservations?event=   výpis registrací
//   POST   reservations/action   { id, action: resend | cancel | revoke }
//   GET    export?event=         CSV
//   GET    stats?event=          registrace v čase
//   GET    staff-codes?event=
//   POST   staff-codes           { event, label }
//   POST   staff-codes/revoke    { id }

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, rpc } from "../_lib/db.js";
import {
  clientIp, hashIp, json, readBody, safeEqual, withErrorHandling,
} from "../_lib/http.js";
import {
  clearCookie, createSession, isAuthenticated, sessionCookie,
} from "../_lib/session.js";
import { createConfirmToken } from "../_lib/tokens.js";
import { sendConfirmationEmail } from "../_lib/email.js";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const COVER_BUCKET = "event-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const siteUrl = () => (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Přihlášení
// ---------------------------------------------------------------------------
async function failedLogins(ipHash) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const { count } = await db()
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("outcome", "admin_login_fail")
    .gte("created_at", since);
  return count ?? 0;
}

async function login(req, res) {
  const ipHash = hashIp(clientIp(req));
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("[admin] Chybí ADMIN_PASSWORD, přihlásit se nejde.");
    return json(res, 500, { ok: false, error: "not_configured" });
  }

  // Bez tohohle by šlo heslo zkoušet donekonečna. Serverové funkce nemají
  // společnou paměť, takže se pokusy počítají v databázi.
  if (ipHash && (await failedLogins(ipHash)) >= LOGIN_MAX_ATTEMPTS) {
    return json(res, 429, { ok: false, error: "too_many_attempts" });
  }

  if (!safeEqual(readBody(req).password, password)) {
    if (ipHash) {
      await db().from("signup_attempts").insert({ ip_hash: ipHash, outcome: "admin_login_fail" });
    }
    return json(res, 401, { ok: false, error: "bad_password" });
  }

  if (ipHash) {
    await db().from("signup_attempts").delete()
      .eq("ip_hash", ipHash).eq("outcome", "admin_login_fail");
  }

  res.setHeader("Set-Cookie", sessionCookie(createSession()));
  return json(res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// Akce
// ---------------------------------------------------------------------------
const EVENT_FIELDS = [
  "slug", "title", "perex", "description", "cover_url", "starts_at", "ends_at",
  "venue_name", "venue_address", "capacity", "registration_closes_at",
  "pending_ttl_minutes", "is_published", "show_on_homepage",
];

async function listEvents(req, res) {
  const { data: events, error } = await db()
    .from("events").select("*").order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);

  // Ke každé akci se dopočítá obsazenost stejnou funkcí, jakou vidí web,
  // ať se čísla v administraci a na webu nemůžou rozejít.
  const withCounts = await Promise.all(
    events.map(async (event) => {
      const availability = await rpc("event_availability", { p_slug: event.slug });
      const { count: total } = await db()
        .from("reservations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
      return { ...event, availability, totalReservations: total ?? 0 };
    }),
  );

  return json(res, 200, { ok: true, events: withCounts });
}

async function saveEvent(req, res) {
  const body = readBody(req);
  const record = {};
  for (const field of EVENT_FIELDS) {
    if (body[field] !== undefined) record[field] = body[field];
  }

  if (!record.slug || !record.title || !record.starts_at) {
    return json(res, 422, { ok: false, error: "missing_fields" });
  }
  if (record.capacity !== undefined && Number(record.capacity) < 1) {
    return json(res, 422, { ok: false, error: "bad_capacity" });
  }

  record.updated_at = new Date().toISOString();

  const { data, error } = await db()
    .from("events").upsert(record, { onConflict: "slug" }).select("*").single();

  if (error) {
    if (error.code === "23505") return json(res, 409, { ok: false, error: "slug_taken" });
    throw new Error(error.message);
  }

  await rpc("refresh_event_counter", { p_event_id: data.id });
  return json(res, 200, { ok: true, event: data });
}

async function deleteEvent(req, res) {
  const { id } = readBody(req);
  if (!id) return json(res, 400, { ok: false, error: "bad_request" });

  const { count } = await db()
    .from("reservations").select("id", { count: "exact", head: true }).eq("event_id", id);

  const { error } = await db().from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

  return json(res, 200, { ok: true, deletedReservations: count ?? 0 });
}

// ---------------------------------------------------------------------------
// Cover fotka
//
// Nahrává se jako data URL, ne jako multipart. Serverové funkce na Vercelu
// dostávají tělo požadavku už načtené a rozebírat multipart ručně by bylo
// víc kódu než užitku, cover má pár set kilobajtů.
// ---------------------------------------------------------------------------
const ALLOWED_IMAGE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function uploadCover(req, res) {
  const { dataUrl } = readBody(req);
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(dataUrl ?? ""));
  if (!match) return json(res, 400, { ok: false, error: "bad_image" });

  const [, mime, base64] = match;
  const extension = ALLOWED_IMAGE[mime];
  if (!extension) return json(res, 415, { ok: false, error: "unsupported_type" });

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_COVER_BYTES) return json(res, 413, { ok: false, error: "too_large" });

  await db().storage.createBucket(COVER_BUCKET, { public: true }).catch(() => {});

  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
  const { error } = await db().storage
    .from(COVER_BUCKET)
    .upload(name, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);

  const { data } = db().storage.from(COVER_BUCKET).getPublicUrl(name);
  return json(res, 200, { ok: true, url: data.publicUrl });
}

// ---------------------------------------------------------------------------
// Registrace
// ---------------------------------------------------------------------------
async function eventBySlug(slug) {
  const { data } = await db().from("events").select("*").eq("slug", slug).maybeSingle();
  return data;
}

async function listReservations(req, res) {
  const event = await eventBySlug(String(req.query.event ?? ""));
  if (!event) return json(res, 404, { ok: false, error: "not_found" });

  const { data, error } = await db()
    .from("reservations")
    .select(
      "id, first_name, last_name, email, phone_e164, status, cancelled_reason, " +
      "consent_marketing, created_at, confirmed_at, checked_in_at, cancelled_at, " +
      "pending_expires_at, resend_count, anonymized_at",
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const availability = await rpc("event_availability", { p_slug: event.slug });
  return json(res, 200, { ok: true, event, availability, reservations: data });
}

async function reservationAction(req, res) {
  const { id, action } = readBody(req);
  if (!id) return json(res, 400, { ok: false, error: "bad_request" });

  const { data: reservation } = await db()
    .from("reservations")
    .select("*, events!inner(slug, title, starts_at, venue_name, venue_address)")
    .eq("id", id)
    .maybeSingle();
  if (!reservation) return json(res, 404, { ok: false, error: "not_found" });

  const now = new Date().toISOString();

  if (action === "cancel" || action === "revoke") {
    // Revokace je zásah pořadatele, zrušení je krok za návštěvníka.
    // Liší se stavem, aby v přehledu i v logu bylo poznat, kdo to udělal.
    const patch = action === "revoke"
      ? { status: "revoked", revoked_at: now }
      : { status: "cancelled", cancelled_at: now, cancelled_reason: "admin" };

    const { data, error } = await db()
      .from("reservations").update(patch).eq("id", id)
      .in("status", ["pending", "confirmed", "checked_in"])
      .select("id, status").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return json(res, 409, { ok: false, error: "wrong_status" });
    return json(res, 200, { ok: true, reservation: data });
  }

  if (action === "resend") {
    if (reservation.status !== "pending") {
      return json(res, 409, { ok: false, error: "wrong_status" });
    }
    const fresh = createConfirmToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db().from("reservations").update({
      confirm_token_hash: fresh.hash,
      confirm_expires_at: expiresAt,
      resend_count: reservation.resend_count + 1,
      last_email_at: now,
    }).eq("id", id);

    await sendConfirmationEmail({
      to: reservation.email,
      lang: reservation.lang,
      firstName: reservation.first_name,
      event: reservation.events,
      confirmUrl: `${siteUrl()}/rezervace/potvrdit?t=${fresh.token}`,
    });

    return json(res, 200, { ok: true });
  }

  return json(res, 400, { ok: false, error: "unknown_action" });
}

// ---------------------------------------------------------------------------
// CSV export
//
// Středníky a BOM schválně: český Excel otevírá čárkou oddělený soubor jako
// jeden sloupec a bez BOM rozsype diakritiku.
// ---------------------------------------------------------------------------
function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  // Buňka začínající =, +, - nebo @ by se v Excelu vyhodnotila jako vzorec.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

async function exportCsv(req, res) {
  const event = await eventBySlug(String(req.query.event ?? ""));
  if (!event) return json(res, 404, { ok: false, error: "not_found" });

  const { data, error } = await db()
    .from("reservations")
    .select("first_name, last_name, email, phone_e164, status, consent_marketing, " +
            "created_at, confirmed_at, checked_in_at, cancelled_at")
    .eq("event_id", event.id)
    .order("created_at");
  if (error) throw new Error(error.message);

  const header = [
    "Jméno", "Příjmení", "E-mail", "Telefon", "Stav", "Marketing",
    "Registrace", "Potvrzení", "Odbavení", "Zrušení",
  ];
  const stavy = {
    pending: "čeká na potvrzení", confirmed: "potvrzeno", checked_in: "odbaveno",
    cancelled: "zrušeno", revoked: "revokováno",
  };
  const time = (value) =>
    value ? new Date(value).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" }) : "";

  const rows = data.map((r) => [
    r.first_name, r.last_name, r.email, r.phone_e164,
    stavy[r.status] ?? r.status, r.consent_marketing ? "ano" : "ne",
    time(r.created_at), time(r.confirmed_at), time(r.checked_in_at), time(r.cancelled_at),
  ]);

  const csv = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const filename = `${event.slug}-registrace-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(csv);
}

// ---------------------------------------------------------------------------
// Registrace v čase
// ---------------------------------------------------------------------------
async function stats(req, res) {
  const event = await eventBySlug(String(req.query.event ?? ""));
  if (!event) return json(res, 404, { ok: false, error: "not_found" });

  const { data, error } = await db()
    .from("reservations")
    .select("created_at, confirmed_at, status")
    .eq("event_id", event.id)
    .order("created_at");
  if (error) throw new Error(error.message);

  // Sype se to po dnech, hodinové rozlišení nemá u stovky míst co ukázat.
  const byDay = new Map();
  for (const row of data) {
    const day = row.created_at.slice(0, 10);
    const entry = byDay.get(day) ?? { day, registrations: 0, confirmations: 0 };
    entry.registrations++;
    if (row.confirmed_at) entry.confirmations++;
    byDay.set(day, entry);
  }

  return json(res, 200, {
    ok: true,
    series: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    byStatus: data.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {}),
  });
}

// ---------------------------------------------------------------------------
// Přístupové kódy obsluhy
//
// Kód se ukazuje jednou při vytvoření, v databázi je jen otisk. Kdyby někdo
// získal přístup k datům, kódy z nich nesestaví.
// ---------------------------------------------------------------------------
const hashCode = (code) => createHash("sha256").update(code).digest("hex");

async function listStaffCodes(req, res) {
  const event = await eventBySlug(String(req.query.event ?? ""));
  if (!event) return json(res, 404, { ok: false, error: "not_found" });

  const { data, error } = await db()
    .from("staff_codes")
    .select("id, label, is_active, created_at, expires_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return json(res, 200, { ok: true, codes: data });
}

async function createStaffCode(req, res) {
  const { event: slug, label } = readBody(req);
  const event = await eventBySlug(String(slug ?? ""));
  if (!event) return json(res, 404, { ok: false, error: "not_found" });

  // Šest znaků bez písmen, která se pletou s číslicemi, ať se to dá diktovat.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const code = Array.from(randomBytes(6))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");

  const { error } = await db().from("staff_codes").insert({
    id: randomUUID(),
    event_id: event.id,
    code_hash: hashCode(code),
    label: label || "Obsluha",
    is_active: true,
  });
  if (error) throw new Error(error.message);

  // Jediné místo, kde kód v čitelné podobě existuje.
  return json(res, 200, { ok: true, code });
}

async function revokeStaffCode(req, res) {
  const { id } = readBody(req);
  const { error } = await db().from("staff_codes").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
  return json(res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const ROUTES = {
  "GET session": (req, res) => json(res, 200, { ok: true, authenticated: isAuthenticated(req) }),
  "POST login": login,
  "POST logout": (req, res) => {
    res.setHeader("Set-Cookie", clearCookie());
    return json(res, 200, { ok: true });
  },

  "GET events": listEvents,
  "POST events": saveEvent,
  "POST events/delete": deleteEvent,
  "POST upload": uploadCover,

  "GET reservations": listReservations,
  "POST reservations/action": reservationAction,
  "GET export": exportCsv,
  "GET stats": stats,

  "GET staff-codes": listStaffCodes,
  "POST staff-codes": createStaffCode,
  "POST staff-codes/revoke": revokeStaffCode,
};

// Bez přihlášení projde jen přihlašování a dotaz na stav session.
const PUBLIC_ROUTES = new Set(["POST login", "GET session", "POST logout"]);

async function handler(req, res) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const key = `${req.method} ${segments.filter(Boolean).join("/")}`;
  const route = ROUTES[key];

  if (!route) return json(res, 404, { ok: false, error: "not_found" });
  if (!PUBLIC_ROUTES.has(key) && !isAuthenticated(req)) {
    return json(res, 401, { ok: false, error: "unauthorized" });
  }

  await route(req, res);
}

export default withErrorHandling(handler);
