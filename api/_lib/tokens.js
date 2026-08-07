// Tokeny: vstupenka, nonce formuláře, potvrzovací odkaz.

import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
  createHash,
  sign as edSign,
  verify as edVerify,
  timingSafeEqual,
} from "node:crypto";

// ---------------------------------------------------------------------------
// base64url
// ---------------------------------------------------------------------------
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const unb64u = (str) => Buffer.from(String(str), "base64url");

// ---------------------------------------------------------------------------
// Vstupenka
//
// Token je binární, ne JSON, protože se musí vejít do QR kódu tak, aby zůstal
// čitelný i z displeje s otiskem. Obsahuje pouze verzi, číslo akce a náhodné
// id vstupenky. Žádné jméno, e-mail ani databázový klíč, takže z uniklého
// tokenu se nedá zjistit nic o jeho majiteli.
//
//   [0]      verze (1)
//   [1..2]   číslo akce, uint16 big endian
//   [3..18]  id vstupenky, 16 bajtů (uuid)
//   [19..82] Ed25519 podpis předchozích 19 bajtů
//
// Celkem 83 bajtů, po base64url 111 znaků.
// ---------------------------------------------------------------------------
export const TICKET_TOKEN_VERSION = 1;
const PAYLOAD_LEN = 19;
const SIG_LEN = 64;

let privateKeyCache;
let publicKeyCache;

function privateKey() {
  if (privateKeyCache) return privateKeyCache;
  const raw = process.env.TICKET_SIGNING_PRIVATE_KEY;
  if (!raw) throw new Error("Chybí TICKET_SIGNING_PRIVATE_KEY");
  privateKeyCache = createPrivateKey({
    key: Buffer.from(raw, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return privateKeyCache;
}

/** Veřejný klíč jde uložit jako holých 32 bajtů, SPKI obal doplníme tady. */
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function publicKey() {
  if (publicKeyCache) return publicKeyCache;
  const raw = process.env.TICKET_PUBLIC_KEY;
  if (raw) {
    publicKeyCache = createPublicKey({
      key: Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(raw, "base64")]),
      format: "der",
      type: "spki",
    });
  } else {
    publicKeyCache = createPublicKey(privateKey());
  }
  return publicKeyCache;
}

export function publicKeyBase64() {
  return publicKey().export({ format: "der", type: "spki" }).subarray(12).toString("base64");
}

const uuidToBytes = (uuid) => Buffer.from(uuid.replaceAll("-", ""), "hex");
const bytesToUuid = (buf) => {
  const h = Buffer.from(buf).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export function signTicket({ eventRef, ticketId }) {
  const payload = Buffer.alloc(PAYLOAD_LEN);
  payload.writeUInt8(TICKET_TOKEN_VERSION, 0);
  payload.writeUInt16BE(eventRef, 1);
  uuidToBytes(ticketId).copy(payload, 3);
  const signature = edSign(null, payload, privateKey());
  return b64u(Buffer.concat([payload, signature]));
}

/**
 * Ověří podpis a rozbalí obsah. Vrací null u čehokoli, co nesedí, aby
 * volající nemusel rozlišovat mezi poškozeným a podvrženým tokenem.
 */
export function verifyTicket(token) {
  try {
    const raw = unb64u(token);
    if (raw.length !== PAYLOAD_LEN + SIG_LEN) return null;

    const payload = raw.subarray(0, PAYLOAD_LEN);
    const signature = raw.subarray(PAYLOAD_LEN);

    if (payload.readUInt8(0) !== TICKET_TOKEN_VERSION) return null;
    if (!edVerify(null, payload, publicKey(), signature)) return null;

    return {
      version: payload.readUInt8(0),
      eventRef: payload.readUInt16BE(1),
      ticketId: bytesToUuid(payload.subarray(3, 19)),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nonce formuláře
//
// Server ji vydá, když se formulář vykreslí, a nese v sobě čas vydání. Díky
// tomu jde na serveru ověřit, že mezi vykreslením a odesláním uplynul rozumný
// čas, aniž bychom věřili hodinám v prohlížeči. Jednorázovost hlídá tabulka
// form_tokens.
// ---------------------------------------------------------------------------
export const MIN_FORM_AGE_MS = 2500;
export const MAX_FORM_AGE_MS = 30 * 60 * 1000;

function formSecret() {
  const secret = process.env.FORM_TOKEN_SECRET;
  if (!secret) throw new Error("Chybí FORM_TOKEN_SECRET");
  return secret;
}

export function issueFormToken(eventId) {
  const payload = { j: randomUUID(), e: eventId, i: Date.now() };
  const body = b64u(JSON.stringify(payload));
  const mac = createHmac("sha256", formSecret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyFormToken(token, eventId) {
  const [body, mac] = String(token ?? "").split(".");
  if (!body || !mac) return { ok: false, reason: "malformed" };

  const expected = createHmac("sha256", formSecret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload;
  try {
    payload = JSON.parse(unb64u(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (payload.e !== eventId) return { ok: false, reason: "wrong_event" };

  const age = Date.now() - Number(payload.i);
  if (!Number.isFinite(age) || age < 0) return { ok: false, reason: "malformed" };
  // Odeslání dřív než za 2,5 s neudělá člověk, ten formulář musí přečíst.
  if (age < MIN_FORM_AGE_MS) return { ok: false, reason: "too_fast" };
  if (age > MAX_FORM_AGE_MS) return { ok: false, reason: "too_old" };

  return { ok: true, jti: payload.j, ageMs: age };
}

// ---------------------------------------------------------------------------
// Potvrzovací odkaz
//
// V databázi leží jen otisk. Kdyby někdo získal přístup k datům, nedokáže
// z nich potvrzovací odkazy zrekonstruovat.
// ---------------------------------------------------------------------------
export function createConfirmToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashConfirmToken(token) };
}

export function hashConfirmToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
