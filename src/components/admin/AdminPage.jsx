// Administrace guestlistu.
//
// Chráněná jedním heslem, bez účtů. Stránka se neindexuje, ale to není
// ochrana, jen slušnost vůči vyhledávačům. Skutečnou ochranou je heslo
// a podepsaná cookie, kterou vydá server.

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, LogOut, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { adminApi } from "../../lib/ticketing/adminApi";
import { formatEventDateTime } from "../../lib/ticketing/format";
import ReservationTable from "./ReservationTable";
import RegistrationChart from "./RegistrationChart";
import EventEditor from "./EventEditor";
import StaffCodes from "./StaffCodes";

const ZALOZKY = [
  { id: "registrace", label: "Registrace" },
  { id: "akce", label: "Nastavení akce" },
  { id: "kody", label: "Kódy obsluhy" },
];

// ---------------------------------------------------------------------------
// Přihlášení
// ---------------------------------------------------------------------------
function Prihlaseni({ onLogin }) {
  const [heslo, setHeslo] = useState("");
  const [chyba, setChyba] = useState("");
  const [pracuju, setPracuju] = useState(false);

  async function odeslat(e) {
    e.preventDefault();
    setPracuju(true);
    setChyba("");
    const vysledek = await adminApi.login(heslo);
    setPracuju(false);
    if (vysledek.ok) return onLogin();
    setChyba(
      vysledek.error === "too_many_attempts"
        ? "Moc pokusů. Zkus to za čtvrt hodiny."
        : vysledek.error === "not_configured"
          ? "Na serveru chybí ADMIN_PASSWORD."
          : "Špatné heslo.",
    );
  }

  return (
    <section className="px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.32)]">
          <h1 className="mb-6 text-left text-xl font-semibold text-white">Administrace</h1>
          <form onSubmit={odeslat}>
            <Input type="password" value={heslo} autoFocus autoComplete="current-password"
              placeholder="Heslo" onChange={(e) => setHeslo(e.target.value)} />
            {chyba && <p className="mt-3 text-xs text-red-400/90">{chyba}</p>}
            <Button type="submit" size="lg" className="mt-5 w-full" disabled={pracuju}>
              {pracuju && <Loader2 className="h-4 w-4 animate-spin" />}
              Přihlásit
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Přehledová čísla
// ---------------------------------------------------------------------------
function Cislo({ popisek, hodnota, zvyraznit }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
      <p className="mb-1 text-xs tracking-wide text-neutral-500 uppercase">{popisek}</p>
      <p className={`text-2xl font-bold ${zvyraznit ? "text-orange-400" : "text-white"}`}>
        {hodnota}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function AdminPage() {
  const [stav, setStav] = useState("zjistuji"); // zjistuji | prihlas | hotovo
  const [akce, setAkce] = useState([]);
  const [vybranaSlug, setVybranaSlug] = useState(null);
  const [data, setData] = useState(null);
  const [statistiky, setStatistiky] = useState(null);
  const [zalozka, setZalozka] = useState("registrace");
  const [nacitam, setNacitam] = useState(false);

  useEffect(() => {
    document.title = "Administrace | heatmapa";
  }, []);

  const nactiAkce = useCallback(async () => {
    const vysledek = await adminApi.events();
    if (!vysledek.ok) return setStav("prihlas");
    setAkce(vysledek.events);
    setVybranaSlug((prev) => prev ?? vysledek.events[0]?.slug ?? null);
    setStav("hotovo");
  }, []);

  useEffect(() => {
    adminApi.session().then((vysledek) => {
      if (vysledek.authenticated) nactiAkce();
      else setStav("prihlas");
    });
  }, [nactiAkce]);

  const nactiDetail = useCallback(async () => {
    if (!vybranaSlug) return;
    setNacitam(true);
    const [registrace, statistika] = await Promise.all([
      adminApi.reservations(vybranaSlug),
      adminApi.stats(vybranaSlug),
    ]);
    if (registrace.ok) setData(registrace);
    if (statistika.ok) setStatistiky(statistika);
    setNacitam(false);
  }, [vybranaSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    nactiDetail();
  }, [nactiDetail]);

  // Čísla se drží aktuální i bez sahání na stránku, aby šel přehled nechat
  // puštěný na notebooku u vchodu.
  useEffect(() => {
    if (stav !== "hotovo") return;
    const timer = setInterval(nactiDetail, 20000);
    return () => clearInterval(timer);
  }, [stav, nactiDetail]);

  async function akceNadRezervaci(id, action) {
    await adminApi.reservationAction(id, action);
    await nactiDetail();
  }

  if (stav === "zjistuji") return <div className="min-h-[60vh]" />;
  if (stav === "prihlas") return <Prihlaseni onLogin={nactiAkce} />;

  const vybrana = akce.find((e) => e.slug === vybranaSlug) ?? null;
  const dostupnost = data?.availability;

  return (
    <section className="px-4 pb-16 md:px-6 md:pb-24">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-left text-2xl font-bold text-white">Administrace</h1>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="md" onClick={nactiDetail}>
              <RefreshCw className={`h-4 w-4 ${nacitam ? "animate-spin" : ""}`} />
              Obnovit
            </Button>
            <Button type="button" variant="ghost" size="md"
              onClick={() => adminApi.logout().then(() => setStav("prihlas"))}>
              <LogOut className="h-4 w-4" />
              Odhlásit
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {akce.map((e) => (
            <button key={e.slug} type="button"
              onClick={() => { setVybranaSlug(e.slug); setZalozka("registrace"); }}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                e.slug === vybranaSlug
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/8 bg-white/2 text-neutral-400 hover:border-white/15"
              }`}>
              {e.title}
              {!e.is_published && <span className="ml-2 text-xs text-neutral-600">skrytá</span>}
            </button>
          ))}
          <button type="button"
            onClick={() => { setVybranaSlug(null); setZalozka("akce"); }}
            className="cursor-pointer rounded-full border border-dashed border-white/15 px-4 py-2 text-sm text-neutral-500 transition-colors hover:border-white/25 hover:text-neutral-300">
            Nová akce
          </button>
        </div>

        {vybrana && (
          <>
            <p className="mb-6 text-sm text-neutral-500">
              {formatEventDateTime(vybrana.starts_at, "cs")} · {vybrana.venue_name}
            </p>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Cislo popisek="Volná místa" zvyraznit
                hodnota={dostupnost ? `${Math.max(0, dostupnost.capacity - dostupnost.taken)}` : "—"} />
              <Cislo popisek="Obsazeno" hodnota={dostupnost ? `${dostupnost.taken} / ${dostupnost.capacity}` : "—"} />
              <Cislo popisek="Potvrzených" hodnota={statistiky?.byStatus?.confirmed ?? 0} />
              <Cislo popisek="Odbavených" hodnota={statistiky?.byStatus?.checked_in ?? 0} />
            </div>

            <div className="mb-6 flex flex-wrap gap-2 border-b border-white/8">
              {ZALOZKY.map((z) => (
                <button key={z.id} type="button" onClick={() => setZalozka(z.id)}
                  className={`cursor-pointer border-b-2 px-1 pb-3 text-sm transition-colors ${
                    zalozka === z.id
                      ? "border-orange-500 text-white"
                      : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}>
                  {z.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_35px_80px_rgba(0,0,0,0.32)] md:p-8">
          {zalozka === "akce" || !vybrana ? (
            <EventEditor
              key={vybrana?.slug ?? "nova"}
              event={vybrana}
              onSaved={(ulozena) => { nactiAkce(); setVybranaSlug(ulozena.slug); }}
            />
          ) : zalozka === "kody" ? (
            <StaffCodes slug={vybranaSlug} />
          ) : (
            <>
              <div className="mb-6">
                <RegistrationChart series={statistiky?.series} />
              </div>
              <div className="mb-5 flex justify-end">
                <Button type="button" variant="outline" size="md" asChild>
                  <a href={adminApi.exportUrl(vybranaSlug)} download>
                    <Download className="h-4 w-4" />
                    Stáhnout CSV
                  </a>
                </Button>
              </div>
              <ReservationTable
                reservations={data?.reservations ?? []}
                onAction={akceNadRezervaci}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
