// Stránka, na kterou vede odkaz z potvrzovacího e-mailu.
//
// Samotné potvrzení posílá POSTem až tahle stránka, ne prohlížeč načtením
// odkazu. Firemní poštovní brány a antiviry odkazy v e-mailech samy
// otevírají, aby je prokleply, a kdyby potvrzení viselo na obyčejném GET,
// potvrdila by rezervaci taková kontrola dřív než člověk.

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useLang } from "../../lib/i18n";

export default function ConfirmPage() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const token = params.get("t");
  // Chybějící token je vidět hned z adresy, není kvůli tomu potřeba
  // překreslovat stránku z efektu.
  const [state, setState] = useState(() =>
    token ? { status: "working" } : { status: "error", reason: "invalid" },
  );
  // Ve vývoji React efekty spouští dvakrát. Server je proti tomu odolný,
  // ale nemá smysl posílat dva požadavky.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;

    fetch("/api/reservations/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (data.ok) {
          setState({ status: "done", ticketUrl: data.ticketUrl, firstTime: data.firstTime });
        } else {
          setState({ status: "error", reason: data.error ?? "invalid" });
        }
      })
      .catch(() => setState({ status: "error", reason: "general" }));
  }, [token]);

  if (state.status === "working") {
    return (
      <Frame>
        <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-neutral-500" />
        <p className="text-sm text-neutral-400">{t.ev.confirmWorking}</p>
      </Frame>
    );
  }

  if (state.status === "done") {
    return (
      <Frame>
        <Badge tone="ok">
          <CheckCircle className="h-6 w-6 text-orange-400" />
        </Badge>
        <h1 className="mb-3 text-2xl font-bold text-white">{t.ev.confirmDoneTitle}</h1>
        <p className="mx-auto mb-7 max-w-sm text-sm leading-relaxed text-neutral-400">
          {state.firstTime ? t.ev.confirmDoneBody : t.ev.confirmAgainBody}
        </p>
        <Button asChild size="lg">
          <Link to={new URL(state.ticketUrl).pathname}>{t.ev.confirmOpenTicket}</Link>
        </Button>
      </Frame>
    );
  }

  const { title, body } = {
    expired: { title: t.ev.confirmExpiredTitle, body: t.ev.confirmExpiredBody },
    cancelled: { title: t.ev.confirmCancelledTitle, body: t.ev.confirmCancelledBody },
    invalid: { title: t.ev.confirmInvalidTitle, body: t.ev.confirmInvalidBody },
  }[state.reason] ?? { title: t.ev.confirmInvalidTitle, body: t.ev.errGeneral };

  return (
    <Frame>
      <Badge tone="error">
        <XCircle className="h-6 w-6 text-neutral-500" />
      </Badge>
      <h1 className="mb-3 text-2xl font-bold text-white">{title}</h1>
      <p className="mx-auto mb-7 max-w-sm text-sm leading-relaxed text-neutral-400">{body}</p>
      <Button asChild variant="outline" size="lg">
        <Link to="/">{t.ev.backToEvent}</Link>
      </Button>
    </Frame>
  );
}

function Frame({ children }) {
  return (
    <section className="px-4 py-16 text-center md:px-6 md:py-24">
      <div className="mx-auto w-full max-w-lg">
        <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.32)]">
          {children}
        </div>
      </div>
    </section>
  );
}

function Badge({ tone, children }) {
  return (
    <div
      className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${
        tone === "ok"
          ? "border-orange-500/20 bg-orange-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      {children}
    </div>
  );
}
