import { Link } from "react-router-dom";
import { useLang } from "../../lib/i18n";

export default function FeaturedEventCard({ event }) {
  const { t } = useLang();
  return (
    <Link
      to={`/event/${event.id}`}
      className="group glass glass-card no-hover-card relative flex w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-3 text-left shadow-[0_30px_80px_rgba(0,0,0,0.35)] no-underline sm:p-4"
    >
      <div className="relative mb-3 h-36 overflow-hidden rounded-2xl bg-neutral-950 sm:mb-4 sm:h-56">
        <span className="absolute left-3 top-3 z-20 inline-flex rounded-full border border-white/10 bg-white/15 px-2.5 py-1 text-xs font-medium text-neutral-100 backdrop-blur-md">
          {event.date}
        </span>
        <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
      </div>
      <div className="px-1">
        <p className="text-base font-semibold leading-tight text-white sm:text-lg">{event.title}</p>
        <p className="mt-0.5 text-xs text-neutral-400 sm:mt-1 sm:text-sm">{event.subtitle}</p>
        <span className="mt-3 flex w-full items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors group-hover:border-white/25 group-hover:bg-white/15 sm:mt-4 sm:py-2.5 sm:text-sm">
          {t.eventViewButton}
        </span>
      </div>
    </Link>
  );
}
