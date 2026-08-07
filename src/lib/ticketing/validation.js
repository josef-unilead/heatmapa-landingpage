// Validace a normalizace registračního formuláře.
//
// Tenhle soubor je jediný zdroj pravdy pro obě strany: importuje si ho
// formulář v prohlížeči i serverová funkce. Kdyby existovaly dvě definice,
// dřív nebo později se rozejdou a server začne přijímat něco, co formulář
// odmítá (nebo hůř, naopak).
//
// Funkce vrací kódy chyb, ne hotové věty. Text si k nim doplní až klient
// z i18n, aby chyby seděly do jazyka, ve kterém web zrovna je.

export const LIMITS = {
  firstName: 60,
  lastName: 60,
  email: 200,
  phone: 20,
};

export const DEFAULT_PHONE_PREFIX = "+420";

// Jednorázové schránky. Nejde o úplný seznam, ten neexistuje, ale pokrývá
// služby, které se reálně objevují. Hlavní obranou je stejně potvrzovací
// e-mail, tohle jen ušetří práci s odpady.
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
  "burnermail.io", "byom.de", "dispostable.com", "e4ward.com", "emailondeck.com",
  "emailtemporario.com.br", "fakeinbox.com", "fakemail.net", "getairmail.com",
  "getnada.com", "grr.la", "guerrillamail.biz", "guerrillamail.com",
  "guerrillamail.de", "guerrillamail.info", "guerrillamail.net",
  "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com",
  "inboxbear.com", "incognitomail.com", "jetable.org", "mail-temporaire.fr",
  "mail7.io", "mailcatch.com", "maildrop.cc", "mailexpire.com", "mailforspam.com",
  "mailinator.com", "mailinator.net", "mailnesia.com", "mailnull.com",
  "mailsac.com", "mailtemp.info", "mintemail.com", "moakt.com", "mohmal.com",
  "mytemp.email", "nada.email", "nowmymail.com", "onetimeemail.net",
  "pokemail.net", "sharklasers.com", "spam4.me", "spamgourmet.com",
  "spambox.us", "spamherelots.com", "tempail.com", "tempinbox.com",
  "tempmail.altmails.com", "tempmail.dev", "tempmail.email", "tempmail.net",
  "tempmail.plus", "tempmailo.com", "tempmail2.com", "temp-mail.io",
  "temp-mail.org", "temp-mail.ru", "tempr.email", "throwawaymail.com",
  "trashmail.com", "trashmail.de", "trashmail.me", "trashmail.net",
  "trbvm.com", "wegwerfmail.de", "yopmail.com", "yopmail.fr", "yopmail.net",
  "zetmail.com",
]);

// Poskytovatelé, kteří ignorují tečky v adrese a všechno za plusem.
// Bez tohohle by jan.novak+1@gmail.com a jannovak@gmail.com prošly jako
// dvě různé adresy, přestože je to jedna schránka.
const DOT_AND_PLUS_BLIND = new Set(["gmail.com", "googlemail.com"]);
const PLUS_BLIND = new Set([
  "outlook.com", "hotmail.com", "live.com", "icloud.com", "me.com",
  "protonmail.com", "proton.me", "seznam.cz", "email.cz", "centrum.cz",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// Jméno musí obsahovat aspoň jedno písmeno. Kromě písmen povolíme mezery,
// pomlčky a apostrofy, ať projdou jména jako Anna-Marie nebo O'Brien.
const NAME_RE = /^[\p{L}][\p{L}\s'’-]*$/u;
const E164_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Sjednotí zápis e-mailu na tvar, ve kterém se porovnává unikátnost.
 * Původní adresa se ukládá zvlášť, posílá se na ni.
 */
export function normalizeEmail(raw) {
  const trimmed = String(raw ?? "").trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (DOT_AND_PLUS_BLIND.has(domain)) {
    local = local.split("+")[0].replaceAll(".", "");
  } else if (PLUS_BLIND.has(domain)) {
    local = local.split("+")[0];
  }

  // googlemail.com je jen jiné jméno pro gmail.com
  const canonicalDomain = domain === "googlemail.com" ? "gmail.com" : domain;
  return `${local}@${canonicalDomain}`;
}

/**
 * Převede telefon na mezinárodní tvar E.164 (+420123456789).
 * Bez předvolby dosadí českou, protože akce jsou zatím v Praze.
 */
export function normalizePhone(raw, defaultPrefix = DEFAULT_PHONE_PREFIX) {
  let value = String(raw ?? "").replace(/[\s()./-]/g, "");
  if (!value) return "";

  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  if (!value.startsWith("+")) {
    // Národní tvar s vodící nulou (běžné třeba v Německu nebo Polsku).
    if (value.startsWith("0")) value = value.slice(1);
    value = `${defaultPrefix}${value}`;
  }

  return value;
}

export function isDisposableEmail(email) {
  const domain = String(email ?? "").split("@")[1];
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

function checkName(value, limit) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "required";
  if (trimmed.length > limit) return "tooLong";
  // Boti do jmen rádi cpou odkazy.
  if (/https?:|www\.|<|>/i.test(trimmed)) return "invalid";
  if (!NAME_RE.test(trimmed)) return "invalid";
  return null;
}

/**
 * Zvaliduje a znormalizuje celý formulář.
 *
 * Vrací { errors, values }, kde errors je objekt pole → kód chyby (prázdný
 * objekt znamená v pořádku) a values obsahuje očištěné hodnoty připravené
 * k uložení.
 */
export function validateReservation(input = {}) {
  const errors = {};

  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const emailRaw = String(input.email ?? "").trim();
  const phoneRaw = String(input.phone ?? "").trim();

  const firstNameError = checkName(firstName, LIMITS.firstName);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = checkName(lastName, LIMITS.lastName);
  if (lastNameError) errors.lastName = lastNameError;

  const email = emailRaw.toLowerCase();
  const emailNormalized = normalizeEmail(emailRaw);
  if (!emailRaw) errors.email = "required";
  else if (emailRaw.length > LIMITS.email) errors.email = "tooLong";
  else if (!EMAIL_RE.test(emailRaw)) errors.email = "invalid";
  else if (isDisposableEmail(emailNormalized)) errors.email = "disposable";

  const phone = normalizePhone(phoneRaw, input.phonePrefix || DEFAULT_PHONE_PREFIX);
  if (!phoneRaw) errors.phone = "required";
  else if (!E164_RE.test(phone)) errors.phone = "invalid";

  if (!input.consentGdpr) errors.consentGdpr = "required";

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    values: {
      firstName,
      lastName,
      email,
      emailNormalized,
      phone,
      consentGdpr: Boolean(input.consentGdpr),
      consentMarketing: Boolean(input.consentMarketing),
      lang: input.lang === "en" ? "en" : "cs",
    },
  };
}
