// Sekce s nejbližší akcí na homepage.
//
// Celá kartička je odkaz na stránku akce. Počet volných míst se dotahuje
// za běhu a ubývá i bez načtení stránky.
//
// Když žádná akce není publikovaná, sekce se nevykreslí vůbec, aby na
// homepage nezůstala prázdná díra.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/i18n";
import { useEventAvailability, spotsLabel } from "../../lib/ticketing/useEventAvailability";
import { formatEventDateTime } from "../../lib/ticketing/format";

function useNextEvent() {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("events")
      .select("slug, title, perex, cover_url, starts_at, venue_name, venue_address")
      .eq("is_published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setEvent(data ?? null);
      });
    return () => {
      active = false;
    };
  }, []);

  return event;
}

/** Odznak s počtem míst. Při vyprodání mění barvu na neutrální. */
function SpotsBadge({ availability, t }) {
  if (!availability) {
    return <span className="text-xs text-neutral-500">{t.ev.loading}</span>;
  }

  if (availability.closed) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
        {t.ev.closed}
      </span>
    );
  }

  if (availability.soldOut) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
        {t.ev.soldOut}
      </span>
    );
  }

  // Poslední místa svítí oranžově, ať je vidět, že se to krátí.
  const urgent = availability.remaining <= 10;
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        urgent
          ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
          : "border-white/10 bg-white/5 text-neutral-300"
      }`}
    >
      {spotsLabel(t, availability.remaining)}
    </span>
  );
}

export default function EventSection() {
  const { t, lang } = useLang();
  const event = useNextEvent();
  const { data: availability } = useEventAvailability(event?.slug);

  if (!event) return null;

  return (
    <section id="akce" className="bg-black px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-3 text-xs font-medium tracking-wide text-orange-400/80 uppercase">
          {t.ev.sectionLabel}
        </p>

        <Link
          to={`/akce/${event.slug}`}
          className="group glass glass-card no-hover-card block overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-[0_30px_80px_rgba(0,0,0,0.35)] transition-colors duration-500 ease-out hover:border-white/20"
        >
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Plakát se zobrazuje celý, ne oříznutý. Bývá na něm název akce
                přes celou plochu a ořez by ho ustřihl. */}
            <div className="relative flex items-center justify-center bg-neutral-950 p-4 md:p-6">
              {event.cover_url && (
                <img
                  src={event.cover_url}
                  alt=""
                  className="max-h-[340px] w-auto max-w-full rounded-2xl object-contain"
                  loading="lazy"
                />
              )}
            </div>

            <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <SpotsBadge availability={availability} t={t} />
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
                  {t.ev.free}
                </span>
              </div>

              <h2 className="text-2xl leading-tight font-extrabold tracking-tight text-white md:text-4xl">
                {event.title}
              </h2>

              {event.perex && (
                <p className="text-sm leading-relaxed text-neutral-400 md:text-base">
                  {event.perex}
                </p>
              )}

              <div className="flex flex-col gap-2 text-sm text-neutral-400">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-neutral-600" />
                  {formatEventDateTime(event.starts_at, lang)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-neutral-600" />
                  {event.venue_name}, {event.venue_address}
                </span>
              </div>

              {/* Vypadá jako tlačítko, ale je to jen část odkazu, kterým je
                  celá kartička. Vnořený button uvnitř odkazu by byl neplatné
                  HTML a čtečkám obrazovky by to hlásilo dva cíle. */}
              <span className="glass-cta mt-2 w-full max-w-64 rounded-full px-5 py-3 text-sm font-semibold">
                {availability?.soldOut ? t.ev.soldOut : t.ev.reserve}
                {!availability?.soldOut && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                )}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
