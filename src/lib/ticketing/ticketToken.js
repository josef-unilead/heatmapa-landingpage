// Rozbalení a ověření tokenu vstupenky v prohlížeči.
//
// Tohle je klientská obdoba toho, co dělá server v api/_lib/tokens.js. Čtečka
// to potřebuje, aby uměla rozhodnout i bez sítě.
//
// Ověření podpisu je tu jako druhá vrstva. Hlavní obranou offline je seznam
// stažený ze serveru: vyrobený token v něm nebude, protože id vstupenky je
// náhodné. Podpis navíc odchytí i případ, kdy by někdo seznam podvrhl.

export const VERZE_TOKENU = 1;
const DELKA_TOKENU = 83;
const DELKA_PAYLOADU = 19;

function zBase64url(text) {
  const doplneno = text.replace(/-/g, "+").replace(/_/g, "/");
  const binarni = atob(doplneno + "=".repeat((4 - (doplneno.length % 4)) % 4));
  return Uint8Array.from(binarni, (znak) => znak.charCodeAt(0));
}

/** Rozbalí token bez ověření podpisu. Vrací null u čehokoli, co nesedí. */
export function rozbalToken(token) {
  try {
    const raw = zBase64url(String(token ?? ""));
    if (raw.length !== DELKA_TOKENU) return null;
    if (raw[0] !== VERZE_TOKENU) return null;

    const eventRef = (raw[1] << 8) | raw[2];
    const hex = [...raw.subarray(3, 19)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const ticketId =
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
      `${hex.slice(16, 20)}-${hex.slice(20)}`;

    return { verze: raw[0], eventRef, ticketId, payload: raw.subarray(0, DELKA_PAYLOADU),
             podpis: raw.subarray(DELKA_PAYLOADU) };
  } catch {
    return null;
  }
}

let klicPromise;

/**
 * Naimportuje veřejný klíč pro ověřování podpisů.
 *
 * Ed25519 ve Web Crypto umí Safari 17+, Chrome 137+ i Firefox. Na starším
 * prohlížeči se ověření přeskočí a rozhoduje jen seznam. Radši čtečka, která
 * na starém telefonu odbavuje podle seznamu, než čtečka, která tam nefunguje.
 */
async function nactiKlic(publicKeyBase64) {
  if (!publicKeyBase64 || !globalThis.crypto?.subtle) return null;
  if (klicPromise) return klicPromise;

  klicPromise = crypto.subtle
    .importKey("raw", Uint8Array.from(atob(publicKeyBase64), (z) => z.charCodeAt(0)),
      { name: "Ed25519" }, false, ["verify"])
    .catch(() => null);

  return klicPromise;
}

/**
 * @returns true platný, false podvržený, null nešlo ověřit (starý prohlížeč)
 */
export async function overPodpis(rozbaleny, publicKeyBase64) {
  const klic = await nactiKlic(publicKeyBase64);
  if (!klic) return null;
  try {
    return await crypto.subtle.verify({ name: "Ed25519" }, klic, rozbaleny.podpis, rozbaleny.payload);
  } catch {
    return null;
  }
}
