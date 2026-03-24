import { Megaphone, Share2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";

const posIcons = [Megaphone, Share2];

export default function JoinTeam() {
  const { t } = useLang();

  const positions = [
    { icon: posIcons[0], title: t.pos1Title, type: t.pos1Type, desc: t.pos1Desc, perks: t.pos1Perks },
    { icon: posIcons[1], title: t.pos2Title, type: t.pos2Type, desc: t.pos2Desc, perks: t.pos2Perks },
  ];

  return (
    <section id="careers" className="border-t border-white/5 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-xl font-light tracking-wide text-neutral-500 md:text-2xl">
            {t.teamTitle1} <span className="font-medium bg-gradient-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.teamHighlight}</span>
          </h2>
          <p className="mx-auto max-w-md text-sm text-neutral-600">
            {t.teamSub}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {positions.map(({ icon: Icon, title, type, desc, perks }) => (
            <Card
              key={title}
              className="flex flex-col transition-all hover:border-white/20 hover:bg-white/8"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.12)]">
                  <Icon className="h-4 w-4 text-orange-400/70" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-500">
                  {type}
                </span>
              </div>

              <h3 className="mb-1.5 text-sm font-medium text-neutral-300">{title}</h3>
              <p className="mb-4 flex-1 text-xs leading-relaxed text-neutral-500">
                {desc}
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                {perks.map((perk) => (
                  <span
                    key={perk}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-neutral-400"
                  >
                    {perk}
                  </span>
                ))}
              </div>

              <Button variant="outline" asChild>
                <Link to="/jobform">
                  {t.applyCta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
