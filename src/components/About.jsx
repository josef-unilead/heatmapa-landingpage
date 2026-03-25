import { MapPin, Flame, Map, UsersRound } from "lucide-react";
import { Card } from "./ui/card";
import { useLang } from "../lib/i18n";

const featureIcons = [MapPin, Flame, Map, UsersRound];
const featureKeys = [
  { title: "feat1Title", desc: "feat1Desc" },
  { title: "feat2Title", desc: "feat2Desc" },
  { title: "feat3Title", desc: "feat3Desc" },
  { title: "feat4Title", desc: "feat4Desc" },
];

export default function About() {
  const { t } = useLang();
  return (
    <section id="about" className="flex h-screen snap-start snap-always items-center px-4 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 text-center md:mb-16">
          <h2 className="mb-2 text-xl font-light tracking-wide text-neutral-500 md:mb-4 md:text-3xl">
            {t.aboutTitle1} <span className="font-medium bg-linear-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.aboutHighlight}</span> {t.aboutTitle2}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-neutral-600 md:text-base">
            {t.aboutSub}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:gap-4">
          {featureKeys.map(({ title, desc }, i) => {
            const Icon = featureIcons[i];
            return (
              <Card
                key={title}
                className="group p-4 hover:border-white/15 hover:bg-white/3 md:p-8"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.12)] md:mb-5 md:h-11 md:w-11">
                  <Icon className="h-4 w-4 text-orange-400/70 md:h-5 md:w-5" />
                </div>
                <h3 className="mb-1 text-sm font-medium text-neutral-300 md:mb-2 md:text-base">
                  {t[title]}
                </h3>
                <p className="text-xs leading-relaxed text-neutral-500 md:text-sm">
                  {t[desc]}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
