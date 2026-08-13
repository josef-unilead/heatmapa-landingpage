// Přehled registrací na akci.
//
// Na mobilu se z tabulky stane seznam kartiček. Tabulka se sedmi sloupci se
// na telefon nevejde a vodorovné rolování v ní je při hledání konkrétního
// člověka k ničemu.

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "../ui/input";

const STAVY = {
  pending: { text: "Čeká na potvrzení", trida: "border-white/10 bg-white/5 text-neutral-400" },
  confirmed: { text: "Potvrzeno", trida: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  checked_in: { text: "Odbaveno", trida: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" },
  cancelled: { text: "Zrušeno", trida: "border-white/8 bg-white/3 text-neutral-600" },
  revoked: { text: "Revokováno", trida: "border-red-500/25 bg-red-500/10 text-red-300/80" },
};

const cas = (value) =>
  value
    ? new Date(value).toLocaleString("cs-CZ", {
        day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Prague",
      })
    : "—";

function Stav({ status, reason }) {
  const stav = STAVY[status] ?? STAVY.cancelled;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${stav.trida}`}>
      {stav.text}
      {status === "cancelled" && reason === "expired" && " (vypršelo)"}
      {status === "cancelled" && reason === "admin" && " (pořadatel)"}
    </span>
  );
}

function Akce({ reservation, onAction, busy }) {
  const lze = {
    resend: reservation.status === "pending",
    cancel: ["pending", "confirmed"].includes(reservation.status),
    revoke: ["pending", "confirmed", "checked_in"].includes(reservation.status),
  };

  if (!lze.resend && !lze.cancel && !lze.revoke) {
    return <span className="text-xs text-neutral-700">—</span>;
  }

  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {busy && <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />}
      {lze.resend && (
        <button type="button" disabled={busy} onClick={() => onAction("resend")}
          className="cursor-pointer text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-300">
          Poslat znovu
        </button>
      )}
      {lze.cancel && (
        <button type="button" disabled={busy} onClick={() => onAction("cancel")}
          className="cursor-pointer text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-300">
          Zrušit
        </button>
      )}
      {lze.revoke && (
        <button type="button" disabled={busy} onClick={() => onAction("revoke")}
          className="cursor-pointer text-red-400/60 underline underline-offset-2 transition-colors hover:text-red-400">
          Revokovat
        </button>
      )}
    </span>
  );
}

export default function ReservationTable({ reservations, onAction }) {
  const [hledani, setHledani] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [potvrzeni, setPotvrzeni] = useState(null);

  const dotaz = hledani.trim().toLowerCase();
  const videt = dotaz
    ? reservations.filter((r) =>
        `${r.first_name} ${r.last_name} ${r.email} ${r.phone_e164}`.toLowerCase().includes(dotaz))
    : reservations;

  async function spustit(reservation, action) {
    // Revokace a zrušení nejdou vzít zpátky, tak se na ně ptáme.
    if ((action === "revoke" || action === "cancel") && potvrzeni?.id !== reservation.id) {
      setPotvrzeni({ id: reservation.id, action });
      return;
    }
    setPotvrzeni(null);
    setBusyId(reservation.id);
    await onAction(reservation.id, action);
    setBusyId(null);
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
        <Input
          type="search" value={hledani} className="pl-10"
          placeholder="Hledat podle jména, e-mailu nebo telefonu"
          onChange={(e) => setHledani(e.target.value)}
        />
      </div>

      {potvrzeni && (
        <p className="mb-4 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-3 text-xs text-orange-200/90">
          {potvrzeni.action === "revoke"
            ? "Revokací vstupenka okamžitě přestane platit a u vchodu neprojde."
            : "Zrušením se uvolní místo dalším zájemcům."}{" "}
          Klikni na stejné tlačítko znovu pro potvrzení, nebo{" "}
          <button type="button" onClick={() => setPotvrzeni(null)}
            className="cursor-pointer underline underline-offset-2">nech to být</button>.
        </p>
      )}

      {videt.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-600">
          {dotaz ? "Nikdo takový tu není." : "Zatím se nikdo nezaregistroval."}
        </p>
      ) : (
        <>
          {/* Mobil */}
          <div className="flex flex-col gap-3 md:hidden">
            {videt.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/8 bg-white/2 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    {r.first_name} {r.last_name}
                  </p>
                  <Stav status={r.status} reason={r.cancelled_reason} />
                </div>
                <p className="text-xs break-all text-neutral-400">{r.email}</p>
                <p className="mb-3 text-xs text-neutral-500">{r.phone_e164}</p>
                <p className="mb-3 text-xs text-neutral-600">
                  Registrace {cas(r.created_at)}
                  {r.confirmed_at && ` · potvrzeno ${cas(r.confirmed_at)}`}
                  {r.checked_in_at && ` · odbaveno ${cas(r.checked_in_at)}`}
                </p>
                <Akce reservation={r} busy={busyId === r.id}
                  onAction={(action) => spustit(r, action)} />
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-xs tracking-wide text-neutral-500 uppercase">
                  <th className="py-2 pr-3 font-medium">Jméno</th>
                  <th className="py-2 pr-3 font-medium">Kontakt</th>
                  <th className="py-2 pr-3 font-medium">Stav</th>
                  <th className="py-2 pr-3 font-medium">Registrace</th>
                  <th className="py-2 pr-3 font-medium">Potvrzeno</th>
                  <th className="py-2 font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {videt.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-3 pr-3 font-medium whitespace-nowrap text-white">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="py-3 pr-3 text-xs text-neutral-400">
                      {r.email}
                      <br />
                      <span className="text-neutral-600">{r.phone_e164}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <Stav status={r.status} reason={r.cancelled_reason} />
                    </td>
                    <td className="py-3 pr-3 text-xs whitespace-nowrap text-neutral-500">
                      {cas(r.created_at)}
                    </td>
                    <td className="py-3 pr-3 text-xs whitespace-nowrap text-neutral-500">
                      {cas(r.confirmed_at)}
                    </td>
                    <td className="py-3">
                      <Akce reservation={r} busy={busyId === r.id}
                        onAction={(action) => spustit(r, action)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
