// Stránka jedné akce s registračním formulářem.
//
// Při plné kapacitě se formulář vůbec nevykreslí. Kontroluje se to na dvou
// místech: tady podle živého počtu míst a ještě jednou na serveru při
// odeslání, protože mezi zobrazením a odesláním se místa můžou zaplnit.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/i18n";
import { useEventAvailability, spotsLabel } from "../../lib/ticketing/useEventAvailability";
import { formatEventDateTime } from "../../lib/ticketing/format";
import ReservationForm from "./ReservationForm";

function Detail({ icon: Icon, children }) {
  return (
    <span className="flex items-start gap-2.5 text-sm text-neutral-400">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" />
      <span>{children}</span>
    </span>
  );
}

export default function EventPage() {
  const { slug } = useParams();
  const { t, lang } = useLang();
  const [event, setEvent] = useState(undefined); // undefined = načítá se
  const { data: availability, refresh } = useEventAvailability(slug);

  useEffect(() => {
    let active = true;
    supabase
      .from("events")
      .select("slug, title, perex, description, cover_url, starts_at, venue_name, venue_address")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => active && setEvent(data ?? null));
    return () => {
      active = false;
    };
  }, [slug]);

  // Titulek a OG značky do HTML dosazuje serverová funkce, aby fungoval
  // náhled při sdílení. Tady se dorovnává jen titulek v záložce pro případ,
  // že se sem člověk proklikl z homepage a HTML se znovu nenačítalo.
  useEffect(() => {
    if (event?.title) document.title = `${event.title} | heatmapa`;
    return () => {
      document.title = "heatmapa";
    };
  }, [event?.title]);

  if (event === undefined) {
    return <div className="min-h-[60vh]" />;
  }

  if (event === null) {
    return (
      <section className="px-4 py-24 text-center md:px-6">
        <h1 className="mb-3 text-2xl font-bold text-white">404</h1>
        <p className="mb-6 text-sm text-neutral-400">{t.ev.ticketNotFoundBody}</p>
        <Link to="/" className="text-sm text-orange-400 underline underline-offset-4">
          {t.back}
        </Link>
      </section>
    );
  }

  const soldOut = availability?.soldOut;
  const closed = availability?.closed;

  return (
    <section className="px-4 pb-16 md:px-6 md:pb-24">
      <div className="mx-auto w-full max-w-3xl">
        {/* Cover je plakát, na kterém bývá text přes celou plochu. Ořezem by
            se ustřihl název akce, proto se zobrazuje celý a jen se vycentruje
            na tmavém podkladu. */}
        {event.cover_url && (
          <div className="mb-8 flex justify-center overflow-hidden rounded-[32px] border border-white/10 bg-neutral-950 p-3">
            <img
              src={event.cover_url}
              alt=""
              className="max-h-[60vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
            {t.ev.free}
          </span>
          {availability && !closed && !soldOut && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                availability.remaining <= 10
                  ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                  : "border-white/10 bg-white/5 text-neutral-300"
              }`}
            >
              {spotsLabel(t, availability.remaining)}
            </span>
          )}
        </div>

        <h1 className="mb-4 text-left text-3xl leading-tight font-extrabold tracking-tight text-white md:text-5xl">
          {event.title}
        </h1>

        <div className="mb-6 flex flex-col gap-2">
          <Detail icon={CalendarDays}>{formatEventDateTime(event.starts_at, lang)}</Detail>
          <Detail icon={MapPin}>
            {event.venue_name}
            <br />
            <span className="text-neutral-500">{event.venue_address}</span>
          </Detail>
        </div>

        {event.description && (
          <div className="mb-10 space-y-4">
            {event.description.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-base leading-7 text-neutral-400">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_35px_80px_rgba(0,0,0,0.32)] md:p-8">
          {soldOut || closed ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Ticket className="h-5 w-5 text-neutral-500" />
              </div>
              <p className="text-base font-semibold text-white">
                {soldOut ? t.ev.soldOut : t.ev.closed}
              </p>
            </div>
          ) : (
            <>
              <h2 className="mb-2 text-left text-lg font-semibold text-white">
                {t.ev.formTitle}
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-neutral-400">{t.ev.formSub}</p>
              <ReservationForm slug={slug} onReserved={refresh} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
