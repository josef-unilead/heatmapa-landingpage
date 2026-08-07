// GET /api/events/:slug
//
// Veřejná data akce, aktuální obsazenost a jednorázová nonce pro formulář.
// Počet volných míst se vždy počítá z tabulky rezervací, nikdy se nebere
// z uloženého čísla, aby nešlo zobrazit zastaralou hodnotu.

import { db, rpc } from "../_lib/db.js";
import { json, methodGuard, withErrorHandling } from "../_lib/http.js";
import { issueFormToken } from "../_lib/tokens.js";

// Sloupce, které smí ven. Vypisuju je schválně ručně, aby se do odpovědi
// nedostal nový interní sloupec jen tím, že ho někdo přidá do tabulky.
const PUBLIC_COLUMNS =
  "id, slug, title, perex, description, cover_url, starts_at, ends_at, " +
  "venue_name, venue_address, capacity, registration_closes_at";

async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;

  const { slug } = req.query;
  if (!slug || typeof slug !== "string") {
    return json(res, 400, { error: "bad_request" });
  }

  const { data: event, error } = await db()
    .from("events")
    .select(PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) return json(res, 404, { error: "not_found" });

  const availability = await rpc("event_availability", { p_slug: slug });
  const remaining = Math.max(0, availability.capacity - availability.taken);

  json(res, 200, {
    event,
    availability: {
      capacity: availability.capacity,
      taken: availability.taken,
      remaining,
      closed: availability.closed,
      soldOut: remaining === 0,
    },
    // Nonce nese čas vydání. Server podle ní pozná, jak dlouho měl člověk
    // formulář otevřený, aniž by musel věřit hodinám v prohlížeči.
    formToken: issueFormToken(event.id),
  });
}

export default withErrorHandling(handler);
