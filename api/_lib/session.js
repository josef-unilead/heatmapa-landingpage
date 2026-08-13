// Přihlášení do administrace.
//
// Žádné účty, jedno heslo. Po jeho ověření dostane prohlížeč podepsanou
// cookie, kterou nejde přečíst ani podvrhnout z JavaScriptu.
//
// Proč ne jen heslo v hlavičce každého požadavku: kdyby heslo putovalo
// s každým voláním, leželo by v paměti stránky a stačilo by jedno XSS
// nebo nepozorný člověk s otevřenou konzolí. Cookie s HttpOnly je pro
// skripty na stránce neviditelná.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE = "hm_admin";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hodin

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("Chybí SESSION_SECRET");
  return value;
}

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Podepsaná session: čas vypršení a náhodné id, aby dvě nebyly stejné. */
export function createSession() {
  const payload = `${Date.now() + TTL_MS}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  return Number(parts[0]) > Date.now();
}

export function sessionCookie(token) {
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
  ];
  // Lokálně jede vývoj na http, kde by Secure cookie prohlížeč zahodil.
  if (process.env.NODE_ENV !== "development") parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function readSession(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

export function isAuthenticated(req) {
  return verifySession(readSession(req));
}
