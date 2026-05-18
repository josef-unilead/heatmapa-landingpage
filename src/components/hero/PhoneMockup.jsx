import { Link } from "react-router-dom";
import { useLang } from "../../lib/i18n";

function IosSignal({ className }) {
  return (
    <svg viewBox="0 0 18 12" className={className} fill="currentColor" aria-hidden="true">
      <rect x="0" y="8.5" width="3" height="3.5" rx="0.6" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.6" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="0.6" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" />
    </svg>
  );
}

function IosWifi({ className }) {
  return (
    <svg viewBox="0 0 16 12" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 1.5C4.7 1.5 1.8 2.7.5 4c-.4.4-.4 1.1 0 1.5.4.4 1 .4 1.5 0C3 4.4 5.3 3.4 8 3.4s5 1 6 2.1c.4.4 1 .4 1.5 0 .4-.4.4-1.1 0-1.5C14.2 2.7 11.3 1.5 8 1.5z" />
      <path d="M8 5.2c-2 0-3.7.8-4.6 1.7-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0 .6-.6 1.8-1.2 3.2-1.2s2.6.6 3.2 1.2c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4C11.7 6 10 5.2 8 5.2z" />
      <circle cx="8" cy="10.2" r="1.4" />
    </svg>
  );
}

function IosBattery({ className }) {
  return (
    <svg viewBox="0 0 26 12" className={className} fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" strokeOpacity="0.45" />
      <rect x="23.5" y="3.75" width="1.6" height="4.5" rx="0.8" fill="currentColor" fillOpacity="0.45" />
      <rect x="2" y="2" width="19" height="8" rx="1.6" fill="currentColor" />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-2 z-30 flex h-8 items-center justify-between px-6 text-[11px] font-semibold text-white">
      <span className="tabular-nums tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5 text-white">
        <IosSignal className="h-2.5 w-auto" />
        <IosWifi className="h-2.5 w-auto" />
        <IosBattery className="h-3 w-auto" />
      </div>
    </div>
  );
}

function HeatBlobs() {
  return (
    <>
      <div className="absolute -left-12 top-24 h-52 w-52 rounded-full bg-orange-500/45 blur-3xl" />
      <div className="absolute -right-8 top-1/2 h-44 w-44 rounded-full bg-amber-400/35 blur-3xl" />
      <div className="absolute bottom-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-rose-500/30 blur-3xl" />
    </>
  );
}

function PopUpBadge() {
  return (
    <div className="absolute left-1/2 top-[30%] z-20 -translate-x-1/2 -translate-y-1/2">
      <div className="relative">
        <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-red-500/40" />
        <img
          src="/pop-up-badge.png"
          alt="Heatmapa Pop-up · Muchova 11 · 22. 5. 2026"
          className="relative h-12 w-12 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.45)]"
        />
      </div>
    </div>
  );
}

function EventPreviewCard({ event }) {
  const { t } = useLang();
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-4">
      <Link
        to={`/event/${event.id}`}
        className="group block w-full overflow-hidden rounded-2xl border border-white/15 bg-black/55 p-2.5 backdrop-blur-xl no-underline"
      >
        <div className="relative mb-2.5 h-24 overflow-hidden rounded-xl bg-neutral-950">
          <span className="absolute left-2 top-2 z-20 inline-flex rounded-full border border-white/10 bg-white/15 px-2 py-0.5 text-[10px] font-medium text-neutral-100 backdrop-blur-md">
            {event.date}
          </span>
          <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
        </div>
        <div className="px-1 pb-1">
          <p className="text-base font-semibold leading-tight text-white">{event.title}</p>
          <p className="mt-1 text-xs text-neutral-400">{event.subtitle}</p>
          <span className="mt-3 flex w-full items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors group-hover:border-white/25 group-hover:bg-white/15">
            {t.eventViewButton}
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function PhoneMockup({ event }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute -inset-6 -z-10 rounded-full bg-orange-500/[0.04] blur-3xl" />
      <div className="relative aspect-[9/19] rounded-[48px] border border-white/15 bg-gradient-to-b from-neutral-800 to-neutral-950 p-[6px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-neutral-950">
          <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
          <StatusBar />
          <HeatBlobs />
          <PopUpBadge />
          <EventPreviewCard event={event} />
        </div>
      </div>
    </div>
  );
}
