// Čtečka vstupenek u vchodu.
//
// Obsluha se přihlásí šestimístným kódem, ne tvým heslem do administrace.
// Kód platí jen na jednu akci, dá se zneplatnit a v logu je podle něj vidět,
// kdo koho pustil.
//
// Počítá se s tím, že u dveří nebude signál. Čtečka si při přihlášení stáhne
// seznam vstupenek, offline rozhoduje z něj a skeny si schová do fronty
// v prohlížeči. Jakmile se síť vrátí, sama je odešle.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloudOff, Loader2, LogOut, RefreshCw, ScanLine, Search, Upload, Wifi,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  nactiRelaci, scannerApi, ulozRelaci, zapomenRelaci,
} from "../../lib/ticketing/scannerApi";
import {
  doFronty, najdiVSeznamu, nactiFrontu, nactiSeznam, odeberZFronty,
  oznacOdbavenou, ulozSeznam, vratOdbaveni, vycistiVse,
} from "../../lib/ticketing/scannerStore";
import { overPodpis, rozbalToken } from "../../lib/ticketing/ticketToken";
import { probudZvuk, zvukNeutralni, zvukOdmitnut, zvukProsel } from "./feedback";
import CameraScanner from "./CameraScanner";
import ScanResult from "./ScanResult";
import ManualSearch from "./ManualSearch";

const OKNO_VRACENI_S = 30;

// ---------------------------------------------------------------------------
// Přihlášení
// ---------------------------------------------------------------------------
function Prihlaseni({ naPrihlaseni }) {
  const [kod, setKod] = useState("");
  const [chyba, setChyba] = useState("");
  const [pracuju, setPracuju] = useState(false);

  async function odeslat(e) {
    e.preventDefault();
    setPracuju(true);
    setChyba("");
    // Zvukový kontext musí vzniknout z dotyku, jinak by čtečka mlčela.
    probudZvuk();

    const odpoved = await scannerApi
      .login(kod.trim().toUpperCase())
      .catch(() => ({ ok: false, error: "network" }));
    setPracuju(false);

    if (!odpoved.ok) {
      setChyba(odpoved.error === "network"
        ? "Bez signálu se přihlásit nedá. Připoj se a zkus to znovu."
        : "Kód neplatí.");
      return;
    }
    naPrihlaseni(odpoved);
  }

  return (
    <section className="px-4 py-20 md:px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.32)]">
          <div className="mb-6 flex items-center gap-3">
            <ScanLine className="h-6 w-6 text-orange-400" />
            <h1 className="text-left text-xl font-semibold text-white">Čtečka vstupenek</h1>
          </div>

          <form onSubmit={odeslat}>
            <Input
              type="text" value={kod} autoFocus maxLength={8}
              inputMode="text" autoCapitalize="characters" autoComplete="off"
              placeholder="Kód obsluhy"
              className="text-center text-2xl tracking-[0.3em] uppercase"
              onChange={(e) => setKod(e.target.value.toUpperCase())}
            />
            {chyba && <p className="mt-3 text-xs text-red-400/90">{chyba}</p>}
            <Button type="submit" size="lg" className="mt-5 w-full" disabled={pracuju || kod.length < 4}>
              {pracuju && <Loader2 className="h-4 w-4 animate-spin" />}
              Přihlásit
            </Button>
          </form>

          <p className="mt-5 text-xs leading-relaxed text-neutral-600">
            Kód dostaneš od pořadatele. Platí 12 hodin a jen na jednu akci.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
export default function ScannerPage() {
  const [relace, setRelace] = useState(() => nactiRelaci());
  const [zalozka, setZalozka] = useState("sken");
  const [vysledek, setVysledek] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [seznam, setSeznam] = useState(() => nactiSeznam());
  const [fronta, setFronta] = useState(() => nactiFrontu().length);
  const [stahuji, setStahuji] = useState(false);
  const [odesilam, setOdesilam] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [zbyvaVratit, setZbyvaVratit] = useState(0);
  const posledniOdbaveni = useRef(null);

  useEffect(() => {
    document.title = "Čtečka vstupenek | heatmapa";
  }, []);

  // Stav sítě. navigator.onLine lže o kvalitě spojení, ale o jeho úplné
  // ztrátě ne, a to je přesně ten případ, který v klubu nastane.
  useEffect(() => {
    const zmena = () => setOnline(navigator.onLine);
    window.addEventListener("online", zmena);
    window.addEventListener("offline", zmena);
    return () => {
      window.removeEventListener("online", zmena);
      window.removeEventListener("offline", zmena);
    };
  }, []);

  // Veřejný klíč se stáhne jednou a zůstane. Bez sítě se ověření podpisu
  // přeskočí a rozhoduje jen stažený seznam.
  useEffect(() => {
    if (!relace) return;
    scannerApi.publicKey()
      .then((o) => o.ok && setPublicKey(o.publicKey))
      .catch(() => {});
  }, [relace]);

  const stahniSeznam = useCallback(async () => {
    if (!relace) return;
    setStahuji(true);
    const odpoved = await scannerApi.manifest(relace.token).catch(() => ({ ok: false }));
    setStahuji(false);
    if (odpoved.ok) {
      ulozSeznam(odpoved);
      setSeznam(nactiSeznam());
    }
  }, [relace]);

  const odesliFrontu = useCallback(async () => {
    if (!relace) return;
    const cekajici = nactiFrontu();
    if (!cekajici.length) return;

    setOdesilam(true);
    const odpoved = await scannerApi.sync(relace.token, cekajici).catch(() => ({ ok: false }));
    setOdesilam(false);
    if (!odpoved.ok) return;

    // Z fronty mizí všechno, co server zpracoval, ať už to přijal nebo
    // odmítl. Konflikt se opakovaným odesláním nevyřeší.
    odeberZFronty(cekajici.map((p) => p.ticket));
    setFronta(nactiFrontu().length);

    if (odpoved.conflicts?.length) {
      setVysledek({
        ok: false, result: "already_used",
        firstName: `${odpoved.conflicts.length} konflikt${odpoved.conflicts.length > 1 ? "y" : ""}`,
        lastName: "při dosynchronizování",
      });
      zvukOdmitnut();
    }
  }, [relace]);

  // Jakmile se vrátí signál, fronta odejde sama. Obsluha na to nemá myslet.
  useEffect(() => {
    // odesliFrontu() je asynchronní, stav se mění až po odpovědi serveru.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (online && relace) odesliFrontu();
  }, [online, relace, odesliFrontu]);

  // Seznam se stáhne po přihlášení a pak se drží čerstvý, dokud je signál.
  useEffect(() => {
    if (!relace || !online) return;
    // Totéž: stahování běží mimo tok vykreslení.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    stahniSeznam();
    const timer = setInterval(stahniSeznam, 120000);
    return () => clearInterval(timer);
  }, [relace, online, stahniSeznam]);

  // Odpočet okna na vzetí zpět.
  useEffect(() => {
    if (zbyvaVratit <= 0) return;
    const timer = setTimeout(() => setZbyvaVratit((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [zbyvaVratit]);

  function ukazVysledek(odpoved, ticket) {
    setVysledek(odpoved);
    if (odpoved.ok) {
      zvukProsel();
      posledniOdbaveni.current = ticket ?? null;
      setZbyvaVratit(ticket ? OKNO_VRACENI_S : 0);
    } else {
      zvukOdmitnut();
      setZbyvaVratit(0);
    }
  }

  /** Rozhodnutí bez sítě jen z místního seznamu. */
  function odbavOffline(rozbaleny, ticket) {
    const zaznam = najdiVSeznamu(rozbaleny.ticketId);

    if (!zaznam) return { ok: false, result: "not_found" };
    if (zaznam.status === "checked_in") {
      return { ok: false, result: "already_used", firstName: zaznam.firstName,
               lastName: zaznam.lastName, checkedInAt: zaznam.checkedInAt };
    }

    const kdy = new Date().toISOString();
    oznacOdbavenou(rozbaleny.ticketId, kdy);
    setFronta(doFronty(ticket));
    setSeznam(nactiSeznam());
    return { ok: true, result: "ok", firstName: zaznam.firstName,
             lastName: zaznam.lastName, checkedInAt: kdy };
  }

  const naSken = useCallback(async (ticket) => {
    if (!relace) return;

    const rozbaleny = rozbalToken(ticket);
    if (!rozbaleny) {
      ukazVysledek({ ok: false, result: "invalid_signature" });
      return;
    }

    // Podpis se ověřuje i offline. Vrací null na prohlížeči, který Ed25519
    // neumí, a tam rozhoduje jen seznam.
    if ((await overPodpis(rozbaleny, publicKey)) === false) {
      ukazVysledek({ ok: false, result: "invalid_signature" });
      return;
    }

    if (rozbaleny.eventRef !== seznam?.event?.ref && seznam?.event?.ref) {
      ukazVysledek({ ok: false, result: "wrong_event" });
      return;
    }

    if (!online) {
      ukazVysledek(odbavOffline(rozbaleny, ticket), ticket);
      return;
    }

    const odpoved = await scannerApi.checkin(relace.token, ticket).catch(() => null);

    // Server neodpověděl, i když se prohlížeč tváří připojeně. Spadneme na
    // offline rozhodnutí, ať fronta u dveří stojí kvůli síti co nejmíň.
    if (!odpoved) {
      setOnline(false);
      ukazVysledek(odbavOffline(rozbaleny, ticket), ticket);
      return;
    }

    if (odpoved.ok) oznacOdbavenou(rozbaleny.ticketId, odpoved.checkedInAt);
    ukazVysledek(odpoved, ticket);
  }, [relace, online, publicKey, seznam]);

  async function vratPosledni() {
    const ticket = posledniOdbaveni.current;
    if (!ticket || !relace) return;

    const rozbaleny = rozbalToken(ticket);
    if (online) {
      const odpoved = await scannerApi.undo(relace.token, ticket).catch(() => null);
      if (!odpoved?.ok) {
        setVysledek({ ok: false, result: "network" });
        return;
      }
    } else {
      // Bez sítě stačí vytáhnout sken z fronty a vrátit stav v seznamu.
      odeberZFronty([ticket]);
      setFronta(nactiFrontu().length);
    }

    if (rozbaleny) vratOdbaveni(rozbaleny.ticketId);
    setSeznam(nactiSeznam());
    setVysledek(null);
    setZbyvaVratit(0);
    posledniOdbaveni.current = null;
    zvukNeutralni();
  }

  function odhlas() {
    if (nactiFrontu().length > 0 &&
        !confirm("Máš neodeslané skeny. Odhlášením o ně přijdeš. Opravdu?")) return;
    zapomenRelaci();
    vycistiVse();
    setRelace(null);
    setSeznam(null);
    setFronta(0);
  }

  if (!relace) {
    return (
      <Prihlaseni
        naPrihlaseni={(odpoved) => {
          const nova = {
            token: odpoved.token, staff: odpoved.staff, event: odpoved.event,
            expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          };
          ulozRelaci(nova);
          setRelace(nova);
        }}
      />
    );
  }

  const pocty = seznam
    ? Object.values(seznam.tickets).reduce(
        (acc, t) => ({
          celkem: acc.celkem + 1,
          odbaveno: acc.odbaveno + (t.status === "checked_in" ? 1 : 0),
        }), { celkem: 0, odbaveno: 0 })
    : null;

  return (
    <section className="px-4 pb-10 md:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{relace.event.title}</p>
            <p className="text-xs text-neutral-500">{relace.staff.label}</p>
          </div>
          <button
            type="button" onClick={odhlas}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Odhlásit
          </button>
        </div>

        {/* Stavový pruh. Obsluha musí na první pohled vidět, jestli je čtečka
            online a jestli něco visí neodeslané. */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
            online ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                   : "border-orange-500/30 bg-orange-500/10 text-orange-300"}`}>
            {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
            {online ? "Online" : "Bez signálu"}
          </span>

          {pocty && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-300">
              Odbaveno {pocty.odbaveno} z {pocty.celkem}
            </span>
          )}

          {fronta > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-400">
              {odesilam ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Upload className="h-3.5 w-3.5" />}
              {fronta} čeká na odeslání
            </span>
          )}

          <button
            type="button" onClick={stahniSeznam} disabled={!online || stahuji}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-400 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${stahuji ? "animate-spin" : ""}`} />
            Obnovit seznam
          </button>
        </div>

        {!seznam && (
          <p className="mb-4 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-3 text-xs leading-relaxed text-orange-200/90">
            Seznam vstupenek ještě není stažený. Dokud máš signál, stáhni ho,
            jinak čtečka bez sítě nic neodbaví.
          </p>
        )}

        <div className="mb-4 flex gap-2">
          {[["sken", "Skenovat", ScanLine], ["hledani", "Hledat podle jména", Search]].map(
            ([id, popis, Ikona]) => (
              <button
                key={id} type="button" onClick={() => setZalozka(id)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors ${
                  zalozka === id
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/8 bg-white/2 text-neutral-400"}`}
              >
                <Ikona className="h-4 w-4" />
                {popis}
              </button>
            ),
          )}
        </div>

        {zalozka === "sken" ? (
          <>
            <CameraScanner onScan={naSken} pozastaveno={Boolean(vysledek)} />
            <p className="mt-4 text-center text-xs leading-relaxed text-neutral-600">
              Namiř na QR kód na telefonu návštěvníka.
              <br />
              Čte se sám, nemusíš nic mačkat.
            </p>
          </>
        ) : (
          <ManualSearch
            token={relace.token} online={online}
            naOdbaveni={(odpoved) => ukazVysledek(odpoved, null)}
          />
        )}
      </div>

      {vysledek && (
        <ScanResult
          vysledek={vysledek} offline={!online}
          zbyvaVratit={zbyvaVratit}
          naVzitZpet={vratPosledni}
          naZavrit={() => setVysledek(null)}
        />
      )}
    </section>
  );
}
