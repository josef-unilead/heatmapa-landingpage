// Validace formuláře zákaznické podpory.
//
// Stejný princip jako u ticketing/validation.js: tenhle soubor si importuje
// formulář v prohlížeči i serverová funkce, aby nemohly vzniknout dvě různé
// definice toho, co je platný dotaz.
//
// Funkce vrací kódy chyb, ne hotové věty. Text si k nim doplní klient z i18n,
// aby chyby seděly do jazyka, ve kterém web zrovna je.

export const LIMITS = {
  name: 100,
  email: 200,
  subject: 200,
  message: 2000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Zvaliduje a očistí dotaz na podporu.
 *
 * Jednorázové schránky se tady schválně neblokují, na rozdíl od registrace na
 * akci. Když má někdo problém, řešíme ho z adresy, kterou nám napíše, a odmítat
 * ho kvůli poskytovateli pošty by bylo proti smyslu podpory.
 */
export function validateSupportRequest(input = {}) {
  const errors = {};

  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  const message = String(input.message ?? "").trim();

  if (!name) errors.name = "required";
  else if (name.length > LIMITS.name) errors.name = "tooLong";

  if (!email) errors.email = "required";
  else if (email.length > LIMITS.email) errors.email = "tooLong";
  else if (!EMAIL_RE.test(email)) errors.email = "invalid";

  if (!subject) errors.subject = "required";
  else if (subject.length > LIMITS.subject) errors.subject = "tooLong";

  if (!message) errors.message = "required";
  else if (message.length > LIMITS.message) errors.message = "tooLong";

  if (!input.consentGdpr) errors.consentGdpr = "required";

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    values: {
      name,
      email: email.toLowerCase(),
      subject,
      message,
      lang: input.lang === "en" ? "en" : "cs",
    },
  };
}
