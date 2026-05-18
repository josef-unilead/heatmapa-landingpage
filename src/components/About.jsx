import { MapPin, Flame, BellRing, UsersRound } from "lucide-react";
import { Card } from "./ui/card";
import { useLang } from "../lib/i18n";

const featureIcons = [MapPin, Flame, BellRing, UsersRound];
const featureKeys = [
  { title: "feat1Title", desc: "feat1Desc" },
  { title: "feat2Title", desc: "feat2Desc" },
  { title: "feat3Title", desc: "feat3Desc" },
  { title: "feat4Title", desc: "feat4Desc" },
];

export default function About() {
  const { t } = useLang();
  return (
    <section id="about" className="flex min-h-[88vh] items-center bg-black px-4 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 text-center md:mb-12">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {`${t.aboutTitle1} ${t.aboutHighlight} ${t.aboutTitle2}`}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            {t.aboutSub}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {featureKeys.map(({ title, desc }, i) => {
            const Icon = featureIcons[i];
            return (
              <Card
                key={title}
                className="no-hover-card flex flex-col items-start gap-5 rounded-4xl border border-white/10 bg-black/20 p-8 text-left shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_16px_rgba(249,115,22,0.18)]">
                  <Icon className="h-6 w-6 text-orange-400/90" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {t[title]}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400">
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
