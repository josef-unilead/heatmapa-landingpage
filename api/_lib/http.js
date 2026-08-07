// Společné HTTP drobnosti pro serverové funkce.

import { createHmac, timingSafeEqual } from "node:crypto";

export function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).send(JSON.stringify(body));
}

export function methodGuard(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader("Allow", allowed.join(", "));
  json(res, 405, { error: "method_not_allowed" });
  return false;
}

export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

/**
 * Adresa klienta. Na Vercelu je první položka x-forwarded-for ta skutečná,
 * zbytek jsou proxy po cestě.
 */
export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

/**
 * IP se nikdy neukládá v čitelné podobě. HMAC se solí je jednosměrný, ale
 * pořád stabilní, takže podle něj jde počítat rate limit.
 */
export function hashIp(ip) {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("Chybí IP_HASH_SALT");
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export function hashUserAgent(req) {
  const ua = req.headers["user-agent"];
  if (!ua) return null;
  const salt = process.env.IP_HASH_SALT;
  return createHmac("sha256", salt).update(ua).digest("hex").slice(0, 32);
}

/** Porovnání odolné proti měření času, na hesla a tajemství. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ""), "utf8");
  const bufB = Buffer.from(String(b ?? ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Obalí handler, aby se z neočekávané výjimky nestala odpověď s výpisem
 * zásobníku. Detail jde do logu, ven jde jen obecná chyba.
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error("[api] neošetřená chyba:", err);
      if (!res.headersSent) json(res, 500, { error: "server_error" });
    }
  };
}
