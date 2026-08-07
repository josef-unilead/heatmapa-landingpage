// Formátování termínu akce. Sdílené webem i e-maily, ať se datum nikde
// nezobrazí jinak než jinde.

const TIME_ZONE = "Europe/Prague";

const LOCALES = { cs: "cs-CZ", en: "en-GB" };

/** Například "neděle 30. srpna 2026, 21:00" */
export function formatEventDateTime(iso, lang = "cs") {
  return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.cs, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Například "30. 8. 2026" */
export function formatEventDate(iso, lang = "cs") {
  return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.cs, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Například "21:00" */
export function formatTime(iso, lang = "cs") {
  return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.cs, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}
