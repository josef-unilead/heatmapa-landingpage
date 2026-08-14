// Výsledek skenu přes celou obrazovku.
//
// Obsluha u dveří má na rozhodnutí vteřinu a kouká přes rameno na frontu.
// Proto barva přes celou plochu a jméno velkým písmem, ne hláška v rohu.
// Detaily jsou pod tím pro případ, že se někdo ptá.

import { Check, X, RotateCcw } from "lucide-react";

const HLASKY = {
  ok: { nadpis: "Pusť dovnitř", tridy: "bg-emerald-500", pusti: true },
  already_used: { nadpis: "Už použitá", tridy: "bg-red-600" },
  invalid_signature: { nadpis: "Neplatná vstupenka", tridy: "bg-red-600" },
  wrong_event: { nadpis: "Jiná akce", tridy: "bg-red-600" },
  cancelled: { nadpis: "Zrušená", tridy: "bg-red-600" },
  revoked: { nadpis: "Zneplatněná", tridy: "bg-red-600" },
  not_confirmed: { nadpis: "Nepotvrzená", tridy: "bg-red-600" },
  not_found: { nadpis: "Neznámá vstupenka", tridy: "bg-red-600" },
  network: { nadpis: "Bez odpovědi", tridy: "bg-neutral-700" },
};

const PODROBNOSTI = {
  already_used: "Tuhle vstupenku už někdo použil.",
  invalid_signature: "Kód nevydal náš systém.",
  wrong_event: "Vstupenka patří na jinou akci.",
  cancelled: "Návštěvník rezervaci zrušil.",
  revoked: "Rezervaci zneplatnil pořadatel.",
  not_confirmed: "Rezervace nebyla potvrzena e-mailem. Pošli člověka za pořadatelem.",
  not_found: "Vstupenka v seznamu není.",
  network: "Server neodpověděl a vstupenka není v offline seznamu.",
};

const cas = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  }) : null;

export default function ScanResult({ vysledek, offline, naZavrit, naVzitZpet, zbyvaVratit }) {
  const stav = HLASKY[vysledek.result] ?? HLASKY.not_found;
  const jmeno = [vysledek.firstName, vysledek.lastName].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={naZavrit}
      data-scan-result={vysledek.result}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-5 px-6 text-center ${stav.tridy}`}
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/20">
        {stav.pusti ? <Check className="h-11 w-11 text-white" strokeWidth={3} />
                    : <X className="h-11 w-11 text-white" strokeWidth={3} />}
      </span>

      <span className="text-3xl leading-tight font-extrabold text-white">{stav.nadpis}</span>

      {jmeno && <span className="text-xl font-semibold text-white/90">{jmeno}</span>}

      {PODROBNOSTI[vysledek.result] && (
        <span className="max-w-xs text-sm leading-relaxed text-white/75">
          {PODROBNOSTI[vysledek.result]}
        </span>
      )}

      {vysledek.result === "already_used" && vysledek.checkedInAt && (
        <span className="text-sm text-white/75">
          Odbaveno v {cas(vysledek.checkedInAt)}
          {vysledek.checkedInBy && ` (${vysledek.checkedInBy})`}
        </span>
      )}

      {vysledek.result === "wrong_event" && vysledek.eventTitle && (
        <span className="text-sm text-white/75">Patří na: {vysledek.eventTitle}</span>
      )}

      {vysledek.repeat && <span className="text-sm text-white/75">Tentýž kód podruhé.</span>}

      {offline && vysledek.ok && (
        <span className="text-sm text-white/75">Bez signálu, odešle se později.</span>
      )}

      {stav.pusti && zbyvaVratit > 0 && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); naVzitZpet(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); naVzitZpet(); } }}
          className="mt-2 flex cursor-pointer items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-medium text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Vzít zpět ({zbyvaVratit} s)
        </span>
      )}

      <span className="absolute bottom-8 text-xs text-white/60">
        Klepni kamkoli a skenuj dál
      </span>
    </button>
  );
}
