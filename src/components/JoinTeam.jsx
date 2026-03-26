import { Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";

export default function JoinTeam() {
  const { t } = useLang();

  return (
    <section id="careers" className="relative flex h-screen snap-start snap-always items-center px-4 md:px-6">
      {/* Bottom fade to blend into LogoSection */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center md:mb-16">
          <h2 className="mb-2 text-xl font-light tracking-wide text-neutral-500 md:mb-4 md:text-3xl">
            {t.teamTitle1} <span className="font-medium bg-linear-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.teamHighlight}</span>
          </h2>
          <p className="mx-auto max-w-lg text-sm text-neutral-600 md:text-base">
            {t.teamSub}
          </p>
        </div>

        <Card className="flex flex-col p-5 md:p-8 lg:p-10">
          <div className="mb-3 flex items-start justify-between md:mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.12)] md:h-11 md:w-11">
              <Users className="h-5 w-5 text-orange-400/70" />
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-neutral-500">
              {t.posType}
            </span>
          </div>

          <h3 className="mb-1 text-base font-medium text-neutral-300 md:mb-2 md:text-lg">{t.posTitle}</h3>
          <p className="mb-4 text-xs leading-relaxed text-neutral-500 md:mb-6 md:text-sm">
            {t.posDesc}
          </p>

          <div className="mb-4 flex flex-wrap gap-2 md:mb-6">
            {t.posPerks.map((perk) => (
              <span
                key={perk}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-400 md:text-sm"
              >
                {perk}
              </span>
            ))}
          </div>

          <Button variant="outline" size="md" asChild className="self-start">
            <Link to="/jobform">
              {t.applyCta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>
      </div>
    </section>
  );
}
