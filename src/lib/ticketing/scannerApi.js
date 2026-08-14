// Volání serveru pro scanner.
//
// Přihlášení drží nosič v hlavičce, ne cookie. Token si čtečka ukládá do
// prohlížeče, protože se u dveří nesmí stát, že by obsluhu odhlásilo
// přepnutí aplikace nebo zhasnutí displeje.

const BASE = "/api/scanner";
const KLIC = "heatmapa.scanner.session";

export function nactiRelaci() {
  try {
    const ulozene = JSON.parse(localStorage.getItem(KLIC) ?? "null");
    if (!ulozene?.token) return null;
    // Token platí 12 hodin. Prošlý zahodíme rovnou, ať se obsluha nediví,
    // proč jí každý sken hlásí chybu.
    if (ulozene.expiresAt && new Date(ulozene.expiresAt) < new Date()) return null;
    return ulozene;
  } catch {
    return null;
  }
}

export function ulozRelaci(relace) {
  try {
    localStorage.setItem(KLIC, JSON.stringify(relace));
  } catch {
    // Soukromé okno. Čtečka pojede, jen se po zavření bude přihlašovat znovu.
  }
}

export function zapomenRelaci() {
  try {
    localStorage.removeItem(KLIC);
  } catch { /* nevadí */ }
}

async function volej(cesta, { method = "GET", token, body } = {}) {
  const odpoved = await fetch(`${BASE}/${cesta}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await odpoved.json().catch(() => ({}));
  return { status: odpoved.status, ...data };
}

export const scannerApi = {
  publicKey: () => volej("public-key"),
  login: (code) => volej("login", { method: "POST", body: { code } }),
  me: (token) => volej("me", { token }),
  checkin: (token, ticket) => volej("checkin", { method: "POST", token, body: { ticket } }),
  undo: (token, ticket) => volej("undo", { method: "POST", token, body: { ticket } }),
  manifest: (token) => volej("manifest", { token }),
  sync: (token, checkins) => volej("sync", { method: "POST", token, body: { checkins } }),
  search: (token, q) => volej(`search?q=${encodeURIComponent(q)}`, { token }),
  manual: (token, reservationId) =>
    volej("manual", { method: "POST", token, body: { reservationId } }),
};
