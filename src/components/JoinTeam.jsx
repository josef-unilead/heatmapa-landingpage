import { Handshake, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";

export default function JoinTeam() {
  const { t } = useLang();

  return (
    <section id="careers" className="relative flex min-h-[88svh] flex-col items-center justify-center px-4 py-16 md:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center md:mb-12">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {`${t.teamTitle1} ${t.teamHighlight}`}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            {t.teamSub}
          </p>
        </div>

        <Card className="glass glass-card no-hover-card flex flex-col items-start gap-6 rounded-[32px] border border-white/10 bg-black/20 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_16px_rgba(249,115,22,0.18)] md:h-14 md:w-14">
            <Handshake className="h-6 w-6 text-orange-400/90" />
          </div>

          <h3 className="text-base font-semibold text-white">{t.posTitle}</h3>
          <p className="text-sm leading-relaxed text-neutral-400">
            {t.posDesc}
          </p>

          <div className="mb-4 flex flex-wrap items-center justify-start gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.18)] md:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              {t.partnerOffer}
            </span>
            {t.posPerks.map((perk) => {
              const full = typeof perk === "string" ? perk : perk.full;
              const short = typeof perk === "string" ? perk : perk.short;
              return (
                <span
                  key={full}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-400 md:text-sm"
                >
                  <span className="md:hidden">{short}</span>
                  <span className="hidden md:inline">{full}</span>
                </span>
              );
            })}
          </div>

          <Button variant="primary" size="md" asChild className="w-full max-w-65">
            <Link to="/partners">
              {t.applyCta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>
      </div>
    </section>
  );
}
