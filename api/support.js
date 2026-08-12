// POST /api/support   uloží dotaz ze zákaznické podpory a pošle ho e-mailem
//
// Proč to nejde přes Supabase napřímo z prohlížeče, jako waitlist a partnerská
// poptávka: kromě uložení má odejít e-mail na support@heatmapa.com a klíč
// k Resendu na klientovi být nesmí. Tím, že je mezi tím server, se navíc dá
// obojí ohlídat — Turnstile i rate limit — což u přímého zápisu nešlo.
//
// Pořadí je schválně "nejdřív ulož, pak pošli": když Resend selže, dotaz
// zůstane v tabulce s notified = false a dá se dohledat. Kdyby se posílalo
// první, spadlé uložení by znamenalo dotaz, o kterém neví nikdo.

import { db } from "./_lib/db.js";
import {
  clientIp, hashIp, json, methodGuard, readBody, withErrorHandling,
} from "./_lib/http.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import { sendSupportEmail } from "./_lib/email.js";
import { validateSupportRequest } from "../src/lib/support/validation.js";

const MAX_PER_IP_PER_HOUR = 3;

async function tooManyRequests(ipHash) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db()
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return (count ?? 0) >= MAX_PER_IP_PER_HOUR;
}

async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;

  const body = readBody(req);
  const ip = clientIp(req);
  const ipHash = hashIp(ip);

  // Honeypot. Pole je pro člověka neviditelné, takže vyplnit ho může jen
  // něco, co si přečetlo HTML a poslušně vyplnilo všechno. Odpověď je stejná
  // jako u úspěchu, ať bot nepozná, že neprošel.
  if (body.company) return json(res, 200, { ok: true });

  if (await tooManyRequests(ipHash)) {
    return json(res, 429, { ok: false, error: "rate_limited" });
  }

  const turnstile = await verifyTurnstile(body.turnstileToken, ip);
  if (!turnstile.ok) {
    return json(res, 400, { ok: false, error: "challenge_failed" });
  }

  const { valid, errors, values } = validateSupportRequest(body);
  if (!valid) {
    return json(res, 422, { ok: false, error: "validation", fields: errors });
  }

  const { data: saved, error: dbError } = await db()
    .from("support_requests")
    .insert({
      name: values.name,
      email: values.email,
      subject: values.subject,
      message: values.message,
      ip_hash: ipHash,
    })
    .select("id, created_at")
    .single();
  if (dbError) throw new Error(dbError.message);

  // E-mail je od tohohle místa jen doručení navíc. Dotaz je uložený, takže
  // když Resend selže, vrátíme úspěch a chybu si necháme v logu — návštěvník
  // za to nemůže a odesílat mu to znovu by dotaz jen zduplikovalo.
  try {
    await sendSupportEmail({ ...values, createdAt: saved.created_at });
    await db().from("support_requests").update({ notified: true }).eq("id", saved.id);
  } catch (err) {
    console.error("[support] e-mail na podporu neodešel:", err.message);
  }

  return json(res, 200, { ok: true });
}

export default withErrorHandling(handler);
