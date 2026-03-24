import { MapPin, Flame, Map, Zap } from "lucide-react";
import { Card } from "./ui/card";
import { useLang } from "../lib/i18n";

const featureIcons = [MapPin, Flame, Map, Zap];
const featureKeys = [
  { title: "feat1Title", desc: "feat1Desc" },
  { title: "feat2Title", desc: "feat2Desc" },
  { title: "feat3Title", desc: "feat3Desc" },
  { title: "feat4Title", desc: "feat4Desc" },
];

export default function About() {
  const { t } = useLang();
  return (
    <section id="about" className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-xl font-light tracking-wide text-neutral-500 md:text-2xl">
            {t.aboutTitle1} <span className="font-medium bg-gradient-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.aboutHighlight}</span> {t.aboutTitle2}
          </h2>
          <p className="mx-auto max-w-md text-sm text-neutral-600">
            {t.aboutSub}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {featureKeys.map(({ title, desc }, i) => {
            const Icon = featureIcons[i];
            return (
              <Card
                key={title}
                className="group transition-all hover:border-white/20 hover:bg-white/8"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.12)]">
                  <Icon className="h-4 w-4 text-orange-400/70" />
                </div>
                <h3 className="mb-1.5 text-sm font-medium text-neutral-300">
                  {t[title]}
                </h3>
                <p className="text-xs leading-relaxed text-neutral-500">
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
