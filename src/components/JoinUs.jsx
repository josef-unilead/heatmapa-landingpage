import { Store, CalendarDays, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";

const roleIcons = [Store, CalendarDays, Compass];
const roleKeys = [
  { title: "role1Title", desc: "role1Desc" },
  { title: "role2Title", desc: "role2Desc" },
  { title: "role3Title", desc: "role3Desc" },
];

export default function JoinUs() {
  const { t } = useLang();
  return (
    <section id="join" className="flex h-dvh snap-start snap-always items-center px-4 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 text-center md:mb-16">
          <h2 className="mb-2 text-xl font-light tracking-wide text-neutral-500 md:mb-4 md:text-3xl">
            {t.joinTitle1} <span className="font-medium bg-linear-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.joinHighlight}</span> {t.joinTitle2}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-neutral-600 md:text-base">
            {t.joinSub}
          </p>
        </div>

        {/* Mobile: horizontal scroll with snap | Desktop: 3-column grid */}
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 md:snap-none">
          {roleKeys.map(({ title, desc }, i) => {
            const Icon = roleIcons[i];
            return (
              <Card
                key={title}
                className="flex w-[75vw] shrink-0 snap-center flex-col p-5 md:w-auto md:shrink md:p-8"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.12)] md:mb-5 md:h-11 md:w-11">
                  <Icon className="h-4 w-4 text-orange-400/70 md:h-5 md:w-5" />
                </div>
                <h3 className="mb-1 text-sm font-medium text-neutral-300 md:mb-2 md:text-base">
                  {t[title]}
                </h3>
                <p className="mb-4 flex-1 text-xs leading-relaxed text-neutral-500 md:mb-6 md:text-sm">
                  {t[desc]}
                </p>
                <Button variant="outline" asChild>
                  <Link to="/waitlist">{t.joinCta}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
