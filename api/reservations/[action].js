// POST /api/reservations/create   založí nepotvrzenou rezervaci
// POST /api/reservations/confirm  potvrdí ji a odešle vstupenku
// POST /api/reservations/resend   pošle potvrzovací e-mail znovu
//
// Všechno je v jednom souboru záměrně: Vercel na free tarifu povoluje
// dvanáct serverových funkcí na nasazení a scanner s administrací jich
// spotřebují víc než dost.
//
// Proč se potvrzuje POSTem a ne GETem na odkaz z e-mailu: firemní poštovní
// brány (Outlook Safe Links, antiviry) odkazy v e-mailech automaticky
// otevírají, aby je prokleply. Kdyby potvrzení viselo na GET, potvrdila by
// rezervaci taková kontrola dřív než člověk. Odkaz proto vede na stránku,
// která teprve po zobrazení pošle POST.

import { db, rpc } from "../_lib/db.js";
import {
  clientIp, hashIp, hashUserAgent, json, methodGuard, readBody, withErrorHandling,
} from "../_lib/http.js";
import {
  createConfirmToken, hashConfirmToken, signTicket, verifyFormToken,
} from "../_lib/tokens.js";
import { verifyTurnstile } from "../_lib/turnstile.js";
import { sendConfirmationEmail, sendTicketEmail } from "../_lib/email.js";
import { ticketQrPng } from "../_lib/qr.js";
import { validateReservation } from "../../src/lib/ticketing/validation.js";

const MAX_ATTEMPTS_PER_HOUR = 5;
const MAX_RESERVATIONS_PER_IP = 3;
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Jediná odpověď, kterou dostane úspěch i případ, kdy adresa v systému už je.
// Kdyby se lišily, dal by se přes formulář zjistit seznam registrovaných.
const NEUTRAL = { ok: true, status: "check_email" };

const siteUrl = () => (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");

async function logAttempt(eventId, ipHash, outcome) {
  if (!ipHash) return;
  await db().from("signup_attempts").insert({
    event_id: eventId ?? null, ip_hash: ipHash, outcome,
  });
}

async function tooManyAttempts(ipHash) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db()
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return (count ?? 0) >= MAX_ATTEMPTS_PER_HOUR;
}

/** Nonce smí projít jen jednou. Unikátní klíč tabulky to hlídá za nás. */
async function consumeFormToken(jti, eventId) {
  const { error } = await db().from("form_tokens").insert({ jti, event_id: eventId });
  if (!error) return true;
  if (error.code === "23505") return false; // už použitá
  throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
async function create(req, res) {
  const body = readBody(req);
  const ip = clientIp(req);
  const ipHash = hashIp(ip);

  // Honeypot. Pole je pro člověka neviditelné, takže vyplnit ho může jen
  // něco, co si přečetlo HTML a poslušně vyplnilo všechno.
  if (body.website) {
    await logAttempt(null, ipHash, "honeypot");
    return json(res, 200, NEUTRAL);
  }

  if (await tooManyAttempts(ipHash)) {
    await logAttempt(null, ipHash, "rate_limited");
    return json(res, 429, { ok: false, error: "rate_limited" });
  }

  const slug = String(body.slug ?? "");
  const { data: event, error: eventError } = await db()
    .from("events").select("id").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) {
    await logAttempt(null, ipHash, "unknown_event");
    return json(res, 404, { ok: false, error: "not_found" });
  }

  // Nonce: ověří stáří formuláře i to, že se neposílá podruhé.
  const form = verifyFormToken(body.formToken, event.id);
  if (!form.ok) {
    await logAttempt(event.id, ipHash, `form_${form.reason}`);
    // Příliš rychlé odeslání je chování robota, ne člověka. Nemá smysl mu
    // radit, co udělal špatně, tak dostane stejnou odpověď jako úspěch.
    if (form.reason === "too_fast") return json(res, 200, NEUTRAL);
    return json(res, 400, { ok: false, error: "stale_form" });
  }
  const turnstile = await verifyTurnstile(body.turnstileToken, ip);
  if (!turnstile.ok) {
    await logAttempt(event.id, ipHash, `turnstile_${turnstile.reason}`);
    return json(res, 400, { ok: false, error: "challenge_failed" });
  }

  const { valid, errors, values } = validateReservation(body);
  if (!valid) {
    await logAttempt(event.id, ipHash, "invalid");
    return json(res, 422, { ok: false, error: "validation", fields: errors });
  }

  // Nonce se spotřebuje až tady, těsně před zápisem.
  //
  // Dřív se spotřebovávala hned po ověření podpisu, tedy před Turnstilem
  // i před validací. Jenže pak stačil jeden neúspěšný pokus, třeba překlep
  // v e-mailu nebo widget, který ještě nestihl vydat token, a nonce shořela.
  // Druhé odeslání pak narazilo na "už použitá", což se navenek tváří jako
  // úspěch, aby se přes formulář nedal zjišťovat seznam registrovaných.
  // Člověk tedy uviděl "Zkontroluj si e-mail" a žádný e-mail nedostal.
  //
  // Proti opakovanému odeslání to chrání stejně dobře: nonce shoří ve chvíli,
  // kdy požadavek opravdu projde, takže jeho zopakování se už nechytne.
  if (!(await consumeFormToken(form.jti, event.id))) {
    await logAttempt(event.id, ipHash, "form_replay");
    return json(res, 200, NEUTRAL);
  }

  const confirm = createConfirmToken();

  const result = await rpc("create_reservation", {
    p_slug: slug,
    p_first_name: values.firstName,
    p_last_name: values.lastName,
    p_email: values.email,
    p_email_normalized: values.emailNormalized,
    p_phone_e164: values.phone,
    p_lang: values.lang,
    p_consent_marketing: values.consentMarketing,
    p_confirm_token_hash: confirm.hash,
    p_ip_hash: ipHash,
    p_ua_hash: hashUserAgent(req),
    p_max_per_ip: MAX_RESERVATIONS_PER_IP,
  });

  await logAttempt(event.id, ipHash, result.ok ? "created" : result.reason);

  if (!result.ok) {
    switch (result.reason) {
      case "full":
        return json(res, 409, { ok: false, error: "sold_out" });
      case "closed":
        return json(res, 409, { ok: false, error: "closed" });
      case "ip_limit":
        return json(res, 429, { ok: false, error: "ip_limit" });
      // Adresa nebo telefon už na akci jsou.
      //
      // Dřív šla ven stejná věta jako u úspěchu, aby formulář nefungoval
      // jako vyhledávač účastníků. Mátlo to ale i lidi, kteří se omylem
      // hlásili podruhé: viděli "Zkontroluj si e-mail" a nic nedostali.
      // Vědomě se tím prozradí, že daný kontakt je registrovaný. Rychlost
      // takového zkoušení drží limit pokusů na IP.
      case "duplicate_email":
        return json(res, 409, { ok: false, error: "duplicate", field: "email" });
      case "duplicate_phone":
        return json(res, 409, { ok: false, error: "duplicate", field: "phone" });
      case "duplicate":
        return json(res, 409, { ok: false, error: "duplicate" });
      default:
        return json(res, 400, { ok: false, error: "rejected" });
    }
  }

  // Rezervace už v tomhle bodě existuje. Kdyby odeslání spadlo a my vrátili
  // chybu, člověk to zkusí znovu a narazí na duplicitu vlastní rezervace,
  // ze které se nedostane. Radši mu řekneme, že e-mail nedorazil, a necháme
  // ho použít tlačítko Poslat znovu.
  try {
    await sendConfirmationEmail({
      to: values.email,
      lang: values.lang,
      firstName: values.firstName,
      event: result.event,
      confirmUrl: `${siteUrl()}/rezervace/potvrdit?t=${confirm.token}`,
    });

    await db().from("reservations")
      .update({ last_email_at: new Date().toISOString() })
      .eq("id", result.reservation_id);
  } catch (err) {
    console.error("[create] e-mail se nepodařilo odeslat:", err.message);
    return json(res, 200, { ...NEUTRAL, emailFailed: true });
  }

  return json(res, 200, NEUTRAL);
}

// ---------------------------------------------------------------------------
// confirm
// ---------------------------------------------------------------------------
async function confirm(req, res) {
  const body = readBody(req);
  const token = String(body.token ?? "");
  if (!token) return json(res, 400, { ok: false, error: "invalid" });

  const result = await rpc("confirm_reservation", { p_token_hash: hashConfirmToken(token) });

  if (!result.ok) {
    return json(res, 410, { ok: false, error: result.reason });
  }

  const { reservation, event } = result;
  const ticketToken = signTicket({ eventRef: event.ref, ticketId: reservation.ticket_id });
  const ticketUrl = `${siteUrl()}/t/${ticketToken}`;

  // Vstupenka odchází jedině tady, tedy až po kliknutí na odkaz v e-mailu.
  // Opakované kliknutí ji neposílá znovu, jen zobrazí stejnou stránku.
  if (result.first_time) {
    await sendTicketEmail({
      to: reservation.email,
      lang: reservation.lang,
      firstName: reservation.first_name,
      lastName: reservation.last_name,
      event,
      ticketUrl,
      cancelUrl: `${ticketUrl}?akce=zrusit`,
      qrPng: await ticketQrPng(ticketToken),
    });
    await db().from("reservations")
      .update({ last_email_at: new Date().toISOString() })
      .eq("id", reservation.id);
  }

  return json(res, 200, {
    ok: true,
    firstTime: result.first_time,
    ticketUrl,
    event: {
      title: event.title,
      starts_at: event.starts_at,
      venue_name: event.venue_name,
      venue_address: event.venue_address,
    },
  });
}

// ---------------------------------------------------------------------------
// resend
// ---------------------------------------------------------------------------
async function resend(req, res) {
  const body = readBody(req);
  const ipHash = hashIp(clientIp(req));

  if (await tooManyAttempts(ipHash)) {
    return json(res, 429, { ok: false, error: "rate_limited" });
  }

  const { valid, values } = validateReservation({
    ...body, firstName: "x", lastName: "x", phone: "+420000000000", consentGdpr: true,
  });
  if (!valid) return json(res, 200, NEUTRAL);

  const { data: event } = await db()
    .from("events").select("id").eq("slug", String(body.slug ?? "")).maybeSingle();
  if (!event) return json(res, 200, NEUTRAL);

  const { data: reservation } = await db()
    .from("reservations")
    .select("id, email, lang, first_name, resend_count, last_email_at, confirm_expires_at, status")
    .eq("event_id", event.id)
    .eq("email_normalized", values.emailNormalized)
    .eq("status", "pending")
    .maybeSingle();

  // Neexistující nebo vyčerpaná rezervace vrací totéž co úspěch.
  if (!reservation || reservation.resend_count >= MAX_RESENDS) {
    return json(res, 200, NEUTRAL);
  }
  if (reservation.last_email_at &&
      Date.now() - new Date(reservation.last_email_at).getTime() < RESEND_COOLDOWN_MS) {
    return json(res, 200, NEUTRAL);
  }

  // Nový odkaz, starý tím přestává platit.
  const fresh = createConfirmToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: full } = await db()
    .from("events").select("title, starts_at, venue_name, venue_address")
    .eq("id", event.id).single();

  await db().from("reservations").update({
    confirm_token_hash: fresh.hash,
    confirm_expires_at: expiresAt,
    resend_count: reservation.resend_count + 1,
    last_email_at: new Date().toISOString(),
  }).eq("id", reservation.id);

  await sendConfirmationEmail({
    to: reservation.email,
    lang: reservation.lang,
    firstName: reservation.first_name,
    event: full,
    confirmUrl: `${siteUrl()}/rezervace/potvrdit?t=${fresh.token}`,
  });

  return json(res, 200, NEUTRAL);
}

// ---------------------------------------------------------------------------
const ROUTES = { create, confirm, resend };

async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  const route = ROUTES[req.query.action];
  if (!route) return json(res, 404, { error: "not_found" });
  await route(req, res);
}

export default withErrorHandling(handler);
