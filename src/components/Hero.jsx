import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";
import PhoneMockup from "./hero/PhoneMockup";
import FeaturedEventCard from "./hero/FeaturedEventCard";

const featuredEvents = {
  cs: {
    id: "e1",
    title: "heatmapa RELEASE POP-UP",
    subtitle: "Muchova 11, Praha 6 · od 13:00",
    image: "/release-popup.jpg",
    date: "22.5.",
  },
  en: {
    id: "e1",
    title: "heatmapa RELEASE POP-UP",
    subtitle: "Muchova 11, Prague 6 · from 1:00 PM",
    image: "/release-popup.jpg",
    date: "May 22",
  },
};

function HeroContent() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <h1 className="mb-2 sm:mb-3">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="logo-glow-pulse pointer-events-none absolute -inset-16 -z-10 rounded-full bg-orange-500/35 blur-3xl lg:-inset-12 lg:bg-orange-500/30"
          />
          <img
            src="/heatmapa-wordmark.svg"
            alt="heatmapa"
            className="relative h-16 w-auto sm:h-20 md:h-24 lg:h-32"
          />
        </span>
        <span className="sr-only">heatmapa — connection of places &amp; people</span>
      </h1>
      <img
        src="/connection-of-places-people.svg"
        alt=""
        aria-hidden="true"
        className="mx-auto mb-6 block h-auto w-72 max-w-full opacity-80 sm:mb-12 sm:w-96 md:w-lg lg:mx-0"
      />
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:justify-start">
        <Button variant="primary" size="lg" asChild>
          <Link to="/waitlist">{t.heroWaitlist}</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="#careers">{t.heroLearn}</a>
        </Button>
      </div>
    </div>
  );
}

export default function Hero() {
  const { lang, t } = useLang();
  const featuredEvent = featuredEvents[lang] || featuredEvents.cs;

  return (
    <section className="relative flex min-h-svh flex-col justify-center bg-black px-4 pt-14 pb-6 md:px-6 md:py-14 lg:min-h-0 lg:block lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-16">
          <div className="flex flex-col lg:justify-center">
            <HeroContent />
          </div>

          <div className="flex w-full items-center justify-center lg:sticky lg:top-24">
            <div className="mx-auto block w-full max-w-md lg:hidden">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.28em] text-orange-400/80">
                {t.heroUpcoming}
              </p>
              <FeaturedEventCard event={featuredEvent} />
            </div>
            <div className="hidden w-full items-center justify-center lg:flex">
              <PhoneMockup event={featuredEvent} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
