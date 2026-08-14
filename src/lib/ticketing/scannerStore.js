// Offline paměť čtečky.
//
// U dveří v klubu nechytá signál. Čtečka proto musí umět rozhodnout sama a
// naskenované vstupenky si zapamatovat, dokud se síť nevrátí.
//
// Ukládá se do localStorage, ne do paměti. Když obsluze spadne prohlížeč nebo
// se vybije telefon, neodeslané skeny nesmí zmizet, jinak by se ti večer
// neshodly počty a nikdo by nezjistil proč.

const KLIC_SEZNAM = "heatmapa.scanner.manifest";
const KLIC_FRONTA = "heatmapa.scanner.queue";

const nacti = (klic, vychozi) => {
  try {
    return JSON.parse(localStorage.getItem(klic) ?? "null") ?? vychozi;
  } catch {
    return vychozi;
  }
};

const uloz = (klic, hodnota) => {
  try {
    localStorage.setItem(klic, JSON.stringify(hodnota));
  } catch {
    // Plné nebo zakázané úložiště. Online režim tím netrpí.
  }
};

// ---------------------------------------------------------------------------
// Seznam vstupenek
// ---------------------------------------------------------------------------
export const nactiSeznam = () => nacti(KLIC_SEZNAM, null);

export function ulozSeznam(manifest) {
  // Pole se překlopí na mapu podle id vstupenky. Při odbavování se hledá
  // jedna položka mezi stovkami a procházet pole u každého skenu je zbytečné.
  uloz(KLIC_SEZNAM, {
    generatedAt: manifest.generatedAt,
    event: manifest.event,
    tickets: Object.fromEntries(manifest.tickets.map((t) => [t.ticketId, t])),
  });
}

export function najdiVSeznamu(ticketId) {
  return nactiSeznam()?.tickets?.[ticketId] ?? null;
}

/** Označí vstupenku jako odbavenou i v místní kopii, ať ji druhý sken chytí. */
export function oznacOdbavenou(ticketId, kdy) {
  const seznam = nactiSeznam();
  if (!seznam?.tickets?.[ticketId]) return;
  seznam.tickets[ticketId] = {
    ...seznam.tickets[ticketId], status: "checked_in", checkedInAt: kdy,
  };
  uloz(KLIC_SEZNAM, seznam);
}

export function vratOdbaveni(ticketId) {
  const seznam = nactiSeznam();
  if (!seznam?.tickets?.[ticketId]) return;
  seznam.tickets[ticketId] = {
    ...seznam.tickets[ticketId], status: "confirmed", checkedInAt: null,
  };
  uloz(KLIC_SEZNAM, seznam);
}

// ---------------------------------------------------------------------------
// Fronta neodeslaných skenů
// ---------------------------------------------------------------------------
export const nactiFrontu = () => nacti(KLIC_FRONTA, []);

export function doFronty(ticket) {
  const fronta = nactiFrontu();
  fronta.push({ ticket, scannedAt: new Date().toISOString() });
  uloz(KLIC_FRONTA, fronta);
  return fronta.length;
}

export function vyprazdniFrontu() {
  uloz(KLIC_FRONTA, []);
}

export function odeberZFronty(tickets) {
  const zahodit = new Set(tickets);
  uloz(KLIC_FRONTA, nactiFrontu().filter((p) => !zahodit.has(p.ticket)));
}

export function vycistiVse() {
  try {
    localStorage.removeItem(KLIC_SEZNAM);
    localStorage.removeItem(KLIC_FRONTA);
  } catch { /* nevadí */ }
}
