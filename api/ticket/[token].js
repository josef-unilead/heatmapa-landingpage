// GET  /api/ticket/:token   údaje vstupenky
// POST /api/ticket/:token   { action: "cancel" } zrušení rezervace
//
// Token v cestě je zároveň obsahem QR kódu. Je neuhodnutelný a podepsaný,
// takže slouží jako důkaz vlastnictví: kdo ho má, drží vstupenku, a smí
// tedy vidět její detail i zrušit rezervaci. Žádné další přihlášení není
// potřeba a ani by nedávalo smysl, účty tu nejsou.

import { db } from "../_lib/db.js";
import { json, methodGuard, readBody, withErrorHandling } from "../_lib/http.js";
import { verifyTicket } from "../_lib/tokens.js";

async function loadTicket(token) {
  const parsed = verifyTicket(token);
  if (!parsed) return { error: "invalid" };

  const { data, error } = await db()
    .from("reservations")
    .select(
      "id, ticket_id, first_name, last_name, status, checked_in_at, lang, " +
      "events!inner(ref, slug, title, starts_at, venue_name, venue_address)",
    )
    .eq("ticket_id", parsed.ticketId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { error: "not_found" };

  // Podpis sedí, ale token je vystavený na jinou akci, než ke které
  // rezervace patří. Nemělo by nastat, ale kdyby ano, je něco špatně.
  if (data.events.ref !== parsed.eventRef) return { error: "invalid" };

  return { reservation: data };
}

function publicShape(reservation) {
  return {
    firstName: reservation.first_name,
    lastName: reservation.last_name,
    status: reservation.status,
    checkedInAt: reservation.checked_in_at,
    event: {
      slug: reservation.events.slug,
      title: reservation.events.title,
      startsAt: reservation.events.starts_at,
      venueName: reservation.events.venue_name,
      venueAddress: reservation.events.venue_address,
    },
  };
}

async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST"])) return;

  const { token } = req.query;
  const { reservation, error } = await loadTicket(String(token ?? ""));
  if (error) return json(res, error === "invalid" ? 400 : 404, { ok: false, error });

  if (req.method === "GET") {
    return json(res, 200, { ok: true, ticket: publicShape(reservation) });
  }

  const body = readBody(req);
  if (body.action !== "cancel") return json(res, 400, { ok: false, error: "bad_request" });

  // Odbavenou vstupenku už rušit nejde, ta osoba je uvnitř.
  if (reservation.status === "checked_in") {
    return json(res, 409, { ok: false, error: "already_used" });
  }
  if (reservation.status === "cancelled" || reservation.status === "revoked") {
    return json(res, 200, { ok: true, ticket: publicShape(reservation) });
  }

  const { data: updated, error: updateError } = await db()
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_reason: "user",
    })
    .eq("id", reservation.id)
    .in("status", ["pending", "confirmed"])
    .select(
      "id, first_name, last_name, status, checked_in_at, " +
      "events!inner(slug, title, starts_at, venue_name, venue_address)",
    )
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updated) return json(res, 409, { ok: false, error: "conflict" });

  return json(res, 200, { ok: true, ticket: publicShape(updated) });
}

export default withErrorHandling(handler);
