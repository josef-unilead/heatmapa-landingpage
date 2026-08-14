// Přihlášení obsluhy do scanneru.
//
// Scanner je samostatná aplikace, ne stránka na tomhle webu, takže se
// nepřihlašuje cookie jako administrace, ale nosičem v hlavičce Authorization.
// Cookie by u nativní nebo cizí aplikace nefungovala spolehlivě.
//
// Relace platí 12 hodin, což pokryje i akci, která se protáhne do rána, a
// zároveň nenechá zapomenutý telefon platný do dalšího týdne. Nese v sobě
// akci, takže kód od jedné akce neodbaví vstupenky na jinou, a id kódu, aby
// v logu bylo poznat, kdo odbavoval.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 12 * 60 * 60 * 1000;

const b64u = (value) => Buffer.from(value).toString("base64url");
const unb64u = (value) => Buffer.from(String(value), "base64url");

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("Chybí SESSION_SECRET");
  return value;
}

export const hashStaffCode = (code) =>
  createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");

export function issueStaffToken({ eventId, eventRef, staffCodeId, label }) {
  const payload = {
    e: eventId, r: eventRef, c: staffCodeId, l: label, x: Date.now() + TTL_MS,
  };
  const body = b64u(JSON.stringify(payload));
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

/** Vrací obsah relace, nebo null. Volající nemusí rozlišovat druh selhání. */
export function verifyStaffToken(token) {
  const [body, mac] = String(token ?? "").split(".");
  if (!body || !mac) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(unb64u(body).toString("utf8"));
  } catch {
    return null;
  }

  if (!payload.x || payload.x < Date.now()) return null;

  return {
    eventId: payload.e,
    eventRef: payload.r,
    staffCodeId: payload.c,
    label: payload.l,
    expiresAt: new Date(payload.x).toISOString(),
  };
}

export function readBearer(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

export const staffFromRequest = (req) => verifyStaffToken(readBearer(req));
