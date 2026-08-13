// Graf registrací v čase.
//
// Sloupec na den, rozdělený na potvrzené a nepotvrzené. Není to graf dvou
// nezávislých veličin, ale jedna veličina rozpadlá podle stavu, takže se
// sčítají do celkové výšky sloupce.
//
// Barvy jsou dva kroky jedné škály, ne dvě různé barvy. Potvrzeno a
// nepotvrzeno jsou po sobě jdoucí fáze, ne rovnocenné kategorie, a jedna
// barva ve dvou odstínech to říká líp. Obojí prošlo kontrolou na odstup
// světlosti, jednotu odstínu i kontrast proti pozadí kartičky.
//
// Kreslí se ručně v SVG, protože kvůli jednomu grafu nemá smysl tahat do
// webu grafovou knihovnu.

import { useState } from "react";

const CONFIRMED = "#FF8A00";
const PENDING = "#8A4B00";

const PADDING = { top: 12, right: 8, bottom: 26, left: 30 };
const HEIGHT = 200;
const BAR_GAP = 2; // mezera mezi sloupci i mezi segmenty uvnitř sloupce

// Horní hranice stupnice. U malých čísel se schválně nezaokrouhluje nahoru
// na pětku, jinak by sloupec s jednou registrací zabíral pětinu výšky a graf
// by vypadal prázdně, přestože data má.
function niceMax(value) {
  if (value <= 4) return Math.max(1, value);
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / step) * step;
}

const denCesky = (iso) =>
  new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" })
    .format(new Date(iso));

export default function RegistrationChart({ series }) {
  const [hover, setHover] = useState(null);

  if (!series?.length) {
    return (
      <p className="py-10 text-center text-sm text-neutral-600">
        Zatím žádné registrace, graf se objeví s první z nich.
      </p>
    );
  }

  const max = niceMax(Math.max(...series.map((d) => d.registrations)));
  // Spodní hranice šířky je štědrá, aby se graf u pár dnů nekrčil v rohu.
  const width = Math.max(560, series.length * 44);
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const bandWidth = plotWidth / series.length;
  const barWidth = Math.min(28, bandWidth - BAR_GAP * 2);

  const y = (value) => PADDING.top + plotHeight - (value / max) * plotHeight;
  // Popisky dnů se u delších řad ředí, jinak se překryjí.
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <div className="relative">
      {/* Legenda je povinná, jakmile jsou v grafu dvě řady. Text zůstává
          v neutrální barvě, identitu nese čtvereček vedle něj. */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CONFIRMED }} />
          Potvrzené
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: PENDING }} />
          Čeká na potvrzení
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          className="max-w-full"
          role="img"
          aria-label="Registrace v čase"
        >
          {/* Mřížka schválně potichu, nemá soupeřit s daty. */}
          {/* Popisky se dedupují: u nízkého stropu by jinak vyšlo 0, 1, 1. */}
          {[...new Set([0, Math.round(max / 2), max])].map((value) => {
            return (
              <g key={value}>
                <line
                  x1={PADDING.left} x2={width - PADDING.right}
                  y1={y(value)} y2={y(value)}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1"
                />
                <text
                  x={PADDING.left - 6} y={y(value) + 3}
                  textAnchor="end" fontSize="9" fill="#6E6E73"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {series.map((day, i) => {
            const pending = day.registrations - day.confirmations;
            const x = PADDING.left + i * bandWidth + (bandWidth - barWidth) / 2;
            const baseline = y(0);
            const confirmedHeight = (day.confirmations / max) * plotHeight;
            const pendingHeight = (pending / max) * plotHeight;

            return (
              <g
                key={day.day}
                onMouseEnter={() => setHover({ ...day, pending, x: x + barWidth / 2 })}
                onMouseLeave={() => setHover(null)}
              >
                {/* Průhledná plocha přes celý sloupec, ať se hover chytá
                    i vedle nízkého sloupečku. */}
                <rect
                  x={PADDING.left + i * bandWidth} y={PADDING.top}
                  width={bandWidth} height={plotHeight}
                  fill="transparent"
                />
                {day.confirmations > 0 && (
                  <rect
                    x={x} y={baseline - confirmedHeight}
                    width={barWidth} height={confirmedHeight}
                    rx="4" fill={CONFIRMED}
                  />
                )}
                {pending > 0 && (
                  <rect
                    x={x}
                    y={baseline - confirmedHeight - pendingHeight - (day.confirmations ? BAR_GAP : 0)}
                    width={barWidth}
                    height={Math.max(2, pendingHeight - (day.confirmations ? BAR_GAP : 0))}
                    rx="4" fill={PENDING}
                  />
                )}
              </g>
            );
          })}

          <line
            x1={PADDING.left} x2={width - PADDING.right}
            y1={y(0)} y2={y(0)}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1"
          />

          {series.map((day, i) =>
            i % labelEvery === 0 ? (
              <text
                key={day.day}
                x={PADDING.left + i * bandWidth + bandWidth / 2}
                y={HEIGHT - 8}
                textAnchor="middle" fontSize="9" fill="#6E6E73"
              >
                {denCesky(day.day)}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      {hover && (
        <div className="pointer-events-none mt-2 text-xs text-neutral-400">
          <span className="font-medium text-white">{denCesky(hover.day)}</span>
          {"  "}
          {hover.registrations} registrací, z toho {hover.confirmations} potvrzených
          {hover.pending > 0 && `, ${hover.pending} čeká`}
        </div>
      )}
    </div>
  );
}
