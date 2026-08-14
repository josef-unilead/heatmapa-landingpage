// Hledání podle jména pro lidi bez vstupenky.
//
// Vybitý telefon, smazaný e-mail, nenajde odkaz. Vždycky se to někomu stane
// a bez téhle obrazovky by obsluha stála u dveří s rozhozenýma rukama.
//
// Funguje jen se signálem. Offline se hledat nedá, protože seznam obsahuje
// jen jména a id, ne dost na spolehlivé dohledání, a odbavit se to stejně
// musí na serveru.

import { useState } from "react";
import { Loader2, Search, WifiOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { scannerApi } from "../../lib/ticketing/scannerApi";

const cas = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  }) : null;

export default function ManualSearch({ token, online, naOdbaveni }) {
  const [dotaz, setDotaz] = useState("");
  const [vysledky, setVysledky] = useState(null);
  const [hledam, setHledam] = useState(false);
  const [odbavuji, setOdbavuji] = useState(null);

  async function hledej(e) {
    e.preventDefault();
    if (dotaz.trim().length < 2) return;
    setHledam(true);
    const odpoved = await scannerApi.search(token, dotaz.trim()).catch(() => ({ ok: false }));
    setHledam(false);
    setVysledky(odpoved.ok ? odpoved.results : []);
  }

  async function odbav(polozka) {
    setOdbavuji(polozka.reservationId);
    const odpoved = await scannerApi
      .manual(token, polozka.reservationId)
      .catch(() => ({ ok: false, result: "network" }));
    setOdbavuji(null);
    naOdbaveni(odpoved);
    if (odpoved.ok) hledej({ preventDefault: () => {} });
  }

  if (!online) {
    return (
      <div className="py-16 text-center">
        <WifiOff className="mx-auto mb-4 h-7 w-7 text-neutral-600" />
        <p className="text-sm leading-relaxed text-neutral-400">
          Hledání potřebuje signál.
          <br />
          Skenování QR funguje i bez něj.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={hledej} className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
          <Input
            type="search" value={dotaz} className="pl-10" autoComplete="off"
            placeholder="Příjmení nebo e-mail"
            onChange={(e) => setDotaz(e.target.value)}
          />
        </div>
        <Button type="submit" size="md" disabled={hledam || dotaz.trim().length < 2}>
          {hledam ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hledat"}
        </Button>
      </form>

      {vysledky?.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-600">Nikdo takový tu není.</p>
      )}

      <ul className="flex flex-col gap-2">
        {(vysledky ?? []).map((polozka) => {
          const odbaveny = polozka.status === "checked_in";
          return (
            <li
              key={polozka.reservationId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/2 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">
                  {polozka.firstName} {polozka.lastName}
                </p>
                <p className="truncate text-xs text-neutral-600">{polozka.emailHint}</p>
                {odbaveny && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Odbaveno v {cas(polozka.checkedInAt)}
                  </p>
                )}
              </div>

              {odbaveny ? (
                <span className="shrink-0 text-xs text-neutral-600">hotovo</span>
              ) : (
                <Button
                  type="button" size="md" className="shrink-0"
                  disabled={odbavuji === polozka.reservationId}
                  onClick={() => odbav(polozka)}
                >
                  {odbavuji === polozka.reservationId
                    ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pustit"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
