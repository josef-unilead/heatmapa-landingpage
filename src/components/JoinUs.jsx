import { Store, CalendarDays, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";

const roleIcons = [Store, CalendarDays, Compass];
const roleKeys = [
  { title: "role1Title", desc: "role1Desc", role: "business" },
  { title: "role2Title", desc: "role2Desc", role: "creator" },
  { title: "role3Title", desc: "role3Desc", role: "explorer" },
];

export default function JoinUs() {
  const { t } = useLang();
  return (
    <section id="join" className="flex min-h-[88svh] items-center overflow-hidden px-4 py-16 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 text-center md:mb-12">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {`${t.joinTitle1} ${t.joinHighlight}`}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            {t.joinSub}
          </p>
        </div>

        {/* Mobile: horizontal scroll with snap | Desktop: 3-column grid */}
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 md:snap-none">
          {roleKeys.map(({ title, desc, role }, i) => {
            const Icon = roleIcons[i];
            return (
              <Card
                key={title}
                className="no-hover-card flex w-[75vw] shrink-0 snap-center flex-col items-start gap-5 rounded-4xl border border-white/10 bg-black/20 p-6 text-left md:w-auto md:shrink md:p-8 md:gap-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_16px_rgba(249,115,22,0.18)] md:h-14 md:w-14">
                  <Icon className="h-6 w-6 text-orange-400/90 md:h-7 md:w-7" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {t[title]}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-neutral-400">
                  {t[desc]}
                </p>
                <Button variant="primary" size="md" asChild className="w-full max-w-65">
                  <Link to={`/waitlist?role=${role}`}>{t.joinCta}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
