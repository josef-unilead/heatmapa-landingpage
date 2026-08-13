// Přístupové kódy pro obsluhu u vchodu.
//
// Kód se v čitelné podobě ukáže jednou, při vytvoření. V databázi je jen
// jeho otisk, takže ho odtud nikdo nepřečte, ani kdyby se k datům dostal.
// Když ho obsluha ztratí, vytvoříš nový a starý zneplatníš.

import { useEffect, useState } from "react";
import { Copy, Loader2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { adminApi } from "../../lib/ticketing/adminApi";

const cas = (value) =>
  new Date(value).toLocaleString("cs-CZ", {
    day: "numeric", month: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  });

export default function StaffCodes({ slug }) {
  const [kody, setKody] = useState([]);
  const [popisek, setPopisek] = useState("");
  const [novy, setNovy] = useState(null);
  const [pracuju, setPracuju] = useState(false);
  const [zkopirovano, setZkopirovano] = useState(false);

  async function nacti() {
    const vysledek = await adminApi.staffCodes(slug);
    if (vysledek.ok) setKody(vysledek.codes);
  }

  useEffect(() => {
    nacti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function vytvorit(e) {
    e.preventDefault();
    setPracuju(true);
    const vysledek = await adminApi.createStaffCode(slug, popisek.trim() || "Obsluha");
    setPracuju(false);
    if (vysledek.ok) {
      setNovy(vysledek.code);
      setZkopirovano(false);
      setPopisek("");
      nacti();
    }
  }

  async function zneplatnit(id) {
    await adminApi.revokeStaffCode(id);
    nacti();
  }

  return (
    <div>
      <p className="mb-5 text-sm leading-relaxed text-neutral-400">
        Kódem se obsluha přihlásí do scanneru na 12 hodin. Každému člověku dej vlastní,
        ať jde poznat, kdo odbavoval, a ztracený se dá zneplatnit bez dopadu na ostatní.
      </p>

      {novy && (
        <div className="mb-6 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-5">
          <p className="mb-2 text-xs text-orange-200/80">
            Opiš si ho teď. Podruhé se už nikde neukáže.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-2xl tracking-[0.2em] text-white">{novy}</code>
            <Button type="button" variant="outline" size="md"
              onClick={() => {
                navigator.clipboard?.writeText(novy);
                setZkopirovano(true);
              }}>
              <Copy className="h-4 w-4" />
              {zkopirovano ? "Zkopírováno" : "Kopírovat"}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={vytvorit} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="min-w-50 flex-1">
          <span className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">
            Popisek
          </span>
          <Input type="text" value={popisek} maxLength={60} placeholder="Například Vchod nebo Petra"
            onChange={(e) => setPopisek(e.target.value)} />
        </label>
        <Button type="submit" size="md" disabled={pracuju}>
          {pracuju ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Vytvořit kód
        </Button>
      </form>

      {kody.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-600">Zatím žádné kódy.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {kody.map((kod) => (
            <li key={kod.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/2 p-4">
              <div>
                <p className="text-sm font-medium text-white">{kod.label}</p>
                <p className="text-xs text-neutral-600">Vytvořen {cas(kod.created_at)}</p>
              </div>
              {kod.is_active ? (
                <button type="button" onClick={() => zneplatnit(kod.id)}
                  className="cursor-pointer text-xs text-red-400/60 underline underline-offset-2 hover:text-red-400">
                  Zneplatnit
                </button>
              ) : (
                <span className="text-xs text-neutral-700">Zneplatněn</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
