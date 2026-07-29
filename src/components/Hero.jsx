import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";
import PhoneMockup from "./hero/PhoneMockup";
import TopicCarousel from "./hero/TopicCarousel";
import HeatmapaWordmark from "./ui/HeatmapaWordmark";

// Pořadí témat a jejich data (společná pro oba jazyky).
// Nadpisy a podnadpisky jsou lokalizované v i18n (t.topics).
// `videos` – dvě videa tématu. Až na /culture-1 jsou soubory už oříznuté přesně na
//   16:9 pruh, který se v kartičce zobrazuje (výřez je zapečený v souboru, ne v CSS).
//   `style` = volitelný `objectPosition` pro doladění výřezu u videa, které je pořád
//   na výšku (0% = nahoře, 50% = uprostřed, 100% = dole).
// `location` – poloha tématu na mapě (lat/lng). Náhodné body kolem centra Prahy,
//   dost blízko, aby přejezd byl plynulý. Zoom je společný (MAP_ZOOM v PhoneMockup).
const TOPIC_ORDER = ["concerts", "culture", "party", "sports", "other"];
const TOPIC_DATA = {
  concerts: {
    videos: [{ src: "/concerts-1" }, { src: "/concerts-2" }],
    location: { lat: 50.0675, lng: 14.4717 }, // Fortuna Aréna (Eden), U Slavie 1540/2a, Praha 10-Vršovice
  },
  culture: {
    videos: [{ src: "/culture-1", style: { objectPosition: "50% 30%" } }, { src: "/culture-2" }],
    location: { lat: 50.0993, lng: 14.4440 }, // SaSaZu (Holešovice)
  },
  party: {
    videos: [{ src: "/party-1" }, { src: "/party-2" }],
    location: { lat: 50.0947, lng: 14.4159 }, // kyvadlo na Letné (metronom)
  },
  sports: {
    videos: [{ src: "/sports-1" }, { src: "/sports-2" }],
    location: { lat: 50.1013, lng: 14.4163 }, // hala Královka
  },
  other: {
    videos: [{ src: "/other-1" }, { src: "/other-2" }],
    location: { lat: 50.0813, lng: 14.4254 }, // Lucerna Music Bar
  },
};

// Mobil i desktop mají vlastní variantu carouselu. Renderujeme vždy jen jednu –
// kdyby v DOM visely obě (jen schované přes CSS), stahují a dekódují se dvě videa
// naráz a na mobilu se navíc zbytečně inicializuje Mapbox v maketě telefonu.
const DESKTOP_MQ = "(min-width: 1024px)"; // = Tailwind lg

function subscribeDesktop(onChange) {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_MQ).matches);
}

function HeroContent() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <div className="mx-auto w-fit lg:mx-0">
        <h1 className="mb-1 leading-0 sm:mb-2">
          <span className="relative block">
            <span
              aria-hidden="true"
              className="logo-glow-pulse pointer-events-none absolute -inset-16 -z-10 rounded-full bg-orange-500/35 blur-3xl lg:-inset-12 lg:bg-orange-500/30"
            />
            <HeatmapaWordmark className="relative h-16 w-auto sm:h-20 md:h-24 lg:h-32" />
          </span>
          <span className="sr-only">heatmapa — connection of places &amp; people</span>
        </h1>
        <img
          src="/connection-of-places-people.svg"
          alt=""
          aria-hidden="true"
          className="mb-3 block h-auto w-65.75 opacity-80 sm:mb-6 sm:w-82.25 md:w-98.5 lg:w-131.5"
        />
      </div>
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:justify-start">
        <Button variant="primary" size="lg" asChild>
          <Link to="/waitlist">{t.heroWaitlist}</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="#careers">{t.heroLearn}</a>
        </Button>
      </div>

      {/* FOMO: App Store + Google Play */}
      <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
        {/* Store badges */}
        <div className="flex items-center gap-3">
          {/* App Store */}
          <div className="glass glass-card no-hover-card flex cursor-default items-center gap-3 border border-white/10 bg-black/20 px-4 py-3 shadow-[0_30px_80px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-out" style={{ borderRadius: '12px' }}>
            <svg className="h-7 w-auto shrink-0 text-white" viewBox="0 0 814 1000" fill="currentColor">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
            </svg>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-[9px] font-medium text-orange-400/80">{t.comingSoonOn}</span>
              <span className="text-[15px] font-semibold text-white">App Store</span>
            </div>
          </div>

          {/* Google Play */}
          <div className="glass glass-card no-hover-card flex cursor-default items-center gap-3 border border-white/10 bg-black/20 px-4 py-3 shadow-[0_30px_80px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-out" style={{ borderRadius: '12px' }}>
            <svg className="h-7 w-auto shrink-0" viewBox="0 0 28.99 31.99">
              <path d="M13.54 15.28.12 29.34a3.66 3.66 0 0 0 5.33 2.16l15.1-8.6Z" fill="#ea4335"/>
              <path d="m27.11 12.89-6.53-3.74-7.35 6.45 7.38 7.28 6.48-3.7a3.54 3.54 0 0 0 1.5-4.79 3.62 3.62 0 0 0-1.5-1.5z" fill="#fbbc04"/>
              <path d="M.12 2.66a3.57 3.57 0 0 0-.12.92v24.84a3.57 3.57 0 0 0 .12.92L14 15.64Z" fill="#4285f4"/>
              <path d="m13.64 16 6.94-6.85L5.5.51A3.73 3.73 0 0 0 3.63 0 3.64 3.64 0 0 0 .12 2.65Z" fill="#34a853"/>
            </svg>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-[9px] font-medium text-orange-400/80">{t.comingSoonOn}</span>
              <span className="text-[15px] font-semibold text-white">Google Play</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Hero() {
  const { t } = useLang();
  const isDesktop = useIsDesktop();

  const topics = TOPIC_ORDER.map((id) => ({
    id,
    title: t.topics[id].title,
    subtitle: t.topics[id].subtitle,
    videos: TOPIC_DATA[id].videos,
    location: TOPIC_DATA[id].location,
  }));

  return (
    <section className="relative flex min-h-svh flex-col justify-center bg-black px-4 pt-14 pb-14 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[9fr_11fr] lg:items-stretch lg:gap-6">
          {/* Mobile: event card below content | Desktop: phone on the left */}
          <div className="order-2 flex w-full items-center justify-center lg:order-1 lg:justify-start lg:sticky lg:top-24">
            {isDesktop ? (
              <div className="flex w-full items-center justify-start">
                <PhoneMockup topics={topics} />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-md">
                <TopicCarousel topics={topics} variant="card" />
              </div>
            )}
          </div>

          {/* Mobile: logo + buttons + store badges on top | Desktop: on the right */}
          <div className="order-1 flex flex-col lg:order-2 lg:justify-center">
            <HeroContent />
          </div>
        </div>
      </div>
    </section>
  );
}
