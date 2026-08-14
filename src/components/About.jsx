import { Store, CalendarDays, Bell, Users } from "lucide-react";
import { useLang } from "../lib/i18n";

const FEATURES = [
  { Icon: Store, key: "feat1Title" },
  { Icon: CalendarDays, key: "feat2Title" },
  { Icon: Bell, key: "feat3Title" },
  { Icon: Users, key: "feat4Title" },
];

export default function About() {
  const { t } = useLang();

  return (
    <section id="about" className="relative flex min-h-svh items-center overflow-hidden bg-black px-4 py-16 md:min-h-0 md:px-6 md:py-24">
      {/* Tady bývala oranžová záře, která měla sekci odlišit od zbytku stránky.
          Právě kvůli ní tu ale vznikala viditelná hrana: záře začínala přesně
          na okraji sekce, takže to působilo jako pruh s jiným pozadím. */}

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white md:mb-5 md:text-4xl">
            {t.aboutTitle1}{" "}
            <span className="text-orange-400">{t.aboutHighlight}</span>{" "}
            {t.aboutTitle2}
          </h2>
          <p className="mx-auto max-w-3xl text-base leading-7 text-neutral-400 md:text-lg md:leading-8">
            {t.aboutSub}
          </p>
        </div>

        {/* Feature icons — plain icon + short label rows, no cards */}
        <div className="mx-auto mt-10 grid w-fit grid-cols-1 gap-x-16 gap-y-6 sm:grid-cols-[auto_auto] md:mt-14 md:gap-y-8">
          {FEATURES.map((feature) => {
            const Icon = feature.Icon;
            return (
              <div key={feature.key} className="flex items-center gap-4">
                <Icon className="h-6 w-6 shrink-0 text-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.35)] md:h-7 md:w-7" />
                <span className="text-base text-white md:text-lg">
                  {t[feature.key]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
