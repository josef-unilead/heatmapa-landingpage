// Webová vstupenka.
//
// QR se kreslí v prohlížeči přímo z tokenu, který je v adrese. Nepotřebuje
// k tomu síť ani nic z databáze, takže i úplně offline se vždycky vykreslí
// platný kód. Ze serveru se dotahují jen jméno a stav, ty se ukládají do
// prohlížeče a bez signálu se použije poslední známá podoba.
//
// Kód je černý na bílém čtverci schválně, i když je zbytek webu tmavý.
// Obarvený nebo invertovaný QR část čteček nepřečte a displej se navíc
// u vchodu zesvětluje.

import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import { CalendarDays, MapPin, Loader2, WifiOff } from "lucide-react";
import { Button } from "../ui/button";
import { useLang } from "../../lib/i18n";
import { formatEventDateTime, formatTime } from "../../lib/ticketing/format";

const storageKey = (token) => `heatmapa.ticket.${token.slice(0, 32)}`;

function StatusBadge({ ticket, t, lang }) {
  const map = {
    confirmed: { text: t.ev.ticketValid, tone: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
    pending: { text: t.ev.ticketValid, tone: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
    checked_in: {
      text: t.ev.ticketUsed.replace("{time}", ticket.checkedInAt ? formatTime(ticket.checkedInAt, lang) : ""),
      tone: "border-white/10 bg-white/5 text-neutral-400",
    },
    cancelled: { text: t.ev.ticketCancelled, tone: "border-white/10 bg-white/5 text-neutral-500" },
    revoked: { text: t.ev.ticketRevoked, tone: "border-white/10 bg-white/5 text-neutral-500" },
  };
  const state = map[ticket.status] ?? map.cancelled;
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${state.tone}`}>
      {state.text}
    </span>
  );
}

export default function TicketPage() {
  const { token } = useParams();
  const { t, lang } = useLang();
  const [qr, setQr] = useState(null);
  // Poslední známá podoba se bere z prohlížeče rovnou při prvním vykreslení,
  // ať je bez signálu hned co ukázat a stránka neproblikne prázdná.
  const [ticket, setTicket] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey(token ?? ""));
      return cached ? JSON.parse(cached) : null;
    } catch {
      // Soukromé okno nebo zaplněné úložiště, nevadí.
      return null;
    }
  });
  const [offline, setOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // QR nejdřív a bez čekání na cokoli. Je to jediná věc, kterou člověk
  // u vchodu opravdu potřebuje.
  useEffect(() => {
    if (!token) return;
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 720,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then(setQr)
      .catch(() => setNotFound(true));
  }, [token]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/ticket/${token}`);
      const data = await response.json();
      if (!data.ok) {
        if (data.error === "not_found" || data.error === "invalid") setNotFound(true);
        return;
      }
      setTicket(data.ticket);
      setOffline(false);
      try {
        localStorage.setItem(storageKey(token), JSON.stringify(data.ticket));
      } catch { /* prázdné úložiště nevadí */ }
    } catch {
      // Bez sítě zůstane vidět uložená podoba a jen se to označí.
      setOffline(true);
    }
  }, [token]);

  useEffect(() => {
    // load() je asynchronní, stav se mění až po odpovědi ze serveru, ne
    // synchronně během efektu. Pravidlo to nepozná a hlásí planý poplach.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Service worker se registruje až tady, aby se kvůli vstupence nezpomaloval
  // zbytek webu. Scope /t/ znamená, že na ostatní stránky nesahá.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/ticket-sw.js", { scope: "/t/" }).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = `${t.ev.ticketTitle} | heatmapa`;
  }, [t]);

  async function cancel() {
    setCancelling(true);
    try {
      const response = await fetch(`/api/ticket/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await response.json();
      if (data.ok) {
        setTicket(data.ticket);
        localStorage.setItem(storageKey(token), JSON.stringify(data.ticket));
      }
    } catch { /* zůstane původní stav */ }
    setCancelling(false);
    setConfirmingCancel(false);
  }

  if (notFound) {
    return (
      <section className="px-4 py-24 text-center md:px-6">
        <h1 className="mb-3 text-2xl font-bold text-white">{t.ev.ticketNotFound}</h1>
        <p className="mb-6 text-sm text-neutral-400">{t.ev.ticketNotFoundBody}</p>
        <Link to="/" className="text-sm text-orange-400 underline underline-offset-4">
          {t.back}
        </Link>
      </section>
    );
  }

  const active = ticket && (ticket.status === "confirmed" || ticket.status === "pending");

  return (
    <section className="px-4 pb-16 md:px-6 md:pb-24">
      <div className="mx-auto w-full max-w-md">
        <div className="glass glass-card no-hover-card overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-[0_35px_80px_rgba(0,0,0,0.32)]">
          <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4">
            <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              {t.ev.ticketTitle}
            </p>
            {ticket && <StatusBadge ticket={ticket} t={t} lang={lang} />}
          </div>

          {/* Bílý čtverec s kódem. Zůstává čitelný, i když je zbytek tmavý. */}
          <div className="mx-6 mb-5 rounded-3xl bg-white p-5">
            {qr ? (
              <img
                src={qr}
                alt={t.ev.ticketShow}
                className={`block aspect-square w-full ${active === false ? "opacity-25" : ""}`}
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            )}
          </div>

          <p className="mb-6 px-6 text-center text-xs text-neutral-500">{t.ev.ticketShow}</p>

          {ticket && (
            <div className="border-t border-white/8 px-6 py-5">
              <p className="mb-4 text-lg font-semibold text-white">
                {ticket.firstName} {ticket.lastName}
              </p>
              <p className="mb-3 text-sm font-medium text-neutral-300">{ticket.event.title}</p>
              <div className="flex flex-col gap-2 text-sm text-neutral-400">
                <span className="flex items-start gap-2.5">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" />
                  {formatEventDateTime(ticket.event.startsAt, lang)}
                </span>
                <span className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" />
                  <span>
                    {ticket.event.venueName}
                    <br />
                    <span className="text-neutral-500">{ticket.event.venueAddress}</span>
                  </span>
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-white/8 px-6 py-5">
            <p className="mb-1 text-xs leading-relaxed text-neutral-500">
              {t.ev.ticketNonTransfer}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-neutral-600">
              {offline && <WifiOff className="h-3 w-3" />}
              {t.ev.ticketOffline}
            </p>
          </div>

          {active && (
            <div className="border-t border-white/8 px-6 py-5">
              {confirmingCancel ? (
                <>
                  <p className="mb-4 text-xs leading-relaxed text-neutral-400">
                    {t.ev.ticketCancelConfirm}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button" variant="outline" size="md"
                      className="flex-1" disabled={cancelling} onClick={cancel}
                    >
                      {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.ev.ticketCancelYes}
                    </Button>
                    <Button
                      type="button" variant="ghost" size="md"
                      className="flex-1" onClick={() => setConfirmingCancel(false)}
                    >
                      {t.ev.ticketCancelNo}
                    </Button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="cursor-pointer text-xs text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-400"
                >
                  {t.ev.ticketCancelAction}
                </button>
              )}
            </div>
          )}

          {ticket && ticket.status === "cancelled" && (
            <div className="border-t border-white/8 px-6 py-5">
              <p className="text-xs text-neutral-500">{t.ev.ticketCancelled2}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
