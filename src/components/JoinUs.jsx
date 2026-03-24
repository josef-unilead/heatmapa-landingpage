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
    <section id="join" className="border-t border-white/5 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-xl font-light tracking-wide text-neutral-500 md:text-2xl">
            {t.joinTitle1} <span className="font-medium bg-gradient-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.joinHighlight}</span> {t.joinTitle2}
          </h2>
          <p className="mx-auto max-w-md text-sm text-neutral-600">
            {t.joinSub}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {roleKeys.map(({ title, desc }, i) => {
            const Icon = roleIcons[i];
            return (
              <Card
                key={title}
                className="flex flex-col transition-all hover:border-white/20 hover:bg-white/8"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.12)]">
                  <Icon className="h-4 w-4 text-orange-400/70" />
                </div>
                <h3 className="mb-1.5 text-sm font-medium text-neutral-300">
                  {t[title]}
                </h3>
                <p className="mb-5 flex-1 text-xs leading-relaxed text-neutral-500">
                  {t[desc]}
                </p>
                <Button variant="ghost" asChild>
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
