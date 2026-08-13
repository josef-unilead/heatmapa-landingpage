// Založení a editace akce.
//
// Formulářová pole jsou stejná jako na veřejné části webu, žádné vlastní
// styly. Datum a čas se zadávají v místním čase a do databáze jdou v UTC.

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { adminApi } from "../../lib/ticketing/adminApi";

const PRAZDNA = {
  slug: "", title: "", perex: "", description: "", cover_url: "",
  starts_at: "", ends_at: "", venue_name: "", venue_address: "",
  capacity: 100, registration_closes_at: "", pending_ttl_minutes: 30,
  is_published: false, show_on_homepage: true,
};

/** ISO z databáze na tvar, který bere <input type="datetime-local">. */
function proInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const posun = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(posun).toISOString().slice(0, 16);
}

const zInputu = (value) => (value ? new Date(value).toISOString() : null);

function Pole({ label, hint, children }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">
        {label}
        {hint && <span className="ml-2 normal-case text-neutral-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Prepinac({ checked, onChange, label, hint }) {
  return (
    <label className="mb-3 flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/15 bg-white/5 transition-all outline-none checked:border-orange-500/50 checked:bg-orange-500/20"
        />
        <svg className="pointer-events-none absolute h-3 w-3 text-orange-400 opacity-0 transition-opacity peer-checked:opacity-100"
             viewBox="0 0 14 14" fill="none">
          <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm text-neutral-300">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-neutral-600">{hint}</span>}
      </span>
    </label>
  );
}

/** Akce z databáze na podobu, kterou chtějí formulářová pole. */
function doFormulare(event) {
  if (!event) return PRAZDNA;
  return {
    ...PRAZDNA,
    ...event,
    starts_at: proInput(event.starts_at),
    ends_at: proInput(event.ends_at),
    registration_closes_at: proInput(event.registration_closes_at),
  };
}

// Komponenta dostává v AdminPage klíč podle akce, takže se při přepnutí na
// jinou akci vytvoří znovu a stav se odvodí z nových props. Dosynchronizovávat
// ho efektem by znamenalo překreslit dvakrát a chvíli ukazovat cizí data.
export default function EventEditor({ event, onSaved }) {
  const [form, setForm] = useState(() => doFormulare(event));
  const [ukladam, setUkladam] = useState(false);
  const [nahravam, setNahravam] = useState(false);
  const [chyba, setChyba] = useState("");
  const [hotovo, setHotovo] = useState(false);
  const souborRef = useRef(null);

  const zmen = (pole) => (value) => {
    setForm((prev) => ({ ...prev, [pole]: value }));
    setHotovo(false);
  };

  async function nahratCover(soubor) {
    if (!soubor) return;
    setNahravam(true);
    setChyba("");
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(soubor);
    });
    const vysledek = await adminApi.uploadCover(soubor.name, dataUrl);
    setNahravam(false);
    if (vysledek.ok) zmen("cover_url")(vysledek.url);
    else setChyba(vysledek.error === "too_large" ? "Obrázek je větší než 5 MB." : "Nahrání se nepovedlo.");
  }

  async function ulozit(e) {
    e.preventDefault();
    setUkladam(true);
    setChyba("");

    const vysledek = await adminApi.saveEvent({
      ...form,
      capacity: Number(form.capacity),
      pending_ttl_minutes: Number(form.pending_ttl_minutes),
      starts_at: zInputu(form.starts_at),
      ends_at: zInputu(form.ends_at),
      registration_closes_at: zInputu(form.registration_closes_at),
      perex: form.perex || null,
      description: form.description || null,
      cover_url: form.cover_url || null,
    });

    setUkladam(false);
    if (!vysledek.ok) {
      setChyba({
        missing_fields: "Vyplň aspoň název, adresu v URL a začátek akce.",
        bad_capacity: "Kapacita musí být aspoň jedna.",
        slug_taken: "Tahle adresa v URL už patří jiné akci.",
      }[vysledek.error] ?? "Uložení se nepovedlo.");
      return;
    }
    setHotovo(true);
    onSaved?.(vysledek.event);
  }

  return (
    <form onSubmit={ulozit}>
      <Pole label="Název akce">
        <Input type="text" value={form.title} onChange={(e) => zmen("title")(e.target.value)} maxLength={200} />
      </Pole>

      <Pole label="Adresa v URL" hint="výsledek: /akce/tvuj-nazev">
        <Input type="text" value={form.slug} maxLength={100}
          onChange={(e) => zmen("slug")(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
      </Pole>

      <Pole label="Krátký popisek" hint="ukáže se na titulce a v náhledu při sdílení">
        <Textarea value={form.perex ?? ""} rows={2} maxLength={300}
          onChange={(e) => zmen("perex")(e.target.value)} />
      </Pole>

      <Pole label="Popis akce" hint="prázdný řádek odděluje odstavce">
        <Textarea value={form.description ?? ""} rows={6} maxLength={4000}
          onChange={(e) => zmen("description")(e.target.value)} />
      </Pole>

      <Pole label="Cover fotka">
        <div className="flex flex-col gap-3">
          {form.cover_url && (
            <img src={form.cover_url} alt=""
                 className="max-h-48 w-auto self-start rounded-2xl border border-white/10" />
          )}
          <input ref={souborRef} type="file" accept="image/jpeg,image/png,image/webp"
                 className="hidden" onChange={(e) => nahratCover(e.target.files?.[0])} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="md" disabled={nahravam}
                    onClick={() => souborRef.current?.click()}>
              {nahravam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {form.cover_url ? "Vyměnit" : "Nahrát"}
            </Button>
            {form.cover_url && (
              <button type="button" onClick={() => zmen("cover_url")("")}
                className="cursor-pointer text-xs text-neutral-600 underline underline-offset-2 hover:text-neutral-400">
                Odebrat
              </button>
            )}
          </div>
        </div>
      </Pole>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Pole label="Začátek"><Input type="datetime-local" value={form.starts_at}
          onChange={(e) => zmen("starts_at")(e.target.value)} /></Pole>
        <Pole label="Konec" hint="nepovinné"><Input type="datetime-local" value={form.ends_at ?? ""}
          onChange={(e) => zmen("ends_at")(e.target.value)} /></Pole>
        <Pole label="Místo"><Input type="text" value={form.venue_name}
          onChange={(e) => zmen("venue_name")(e.target.value)} maxLength={200} /></Pole>
        <Pole label="Adresa"><Input type="text" value={form.venue_address}
          onChange={(e) => zmen("venue_address")(e.target.value)} maxLength={300} /></Pole>
        <Pole label="Kapacita"><Input type="number" min="1" value={form.capacity}
          onChange={(e) => zmen("capacity")(e.target.value)} /></Pole>
        <Pole label="Uzávěrka registrací" hint="nepovinné">
          <Input type="datetime-local" value={form.registration_closes_at ?? ""}
            onChange={(e) => zmen("registration_closes_at")(e.target.value)} /></Pole>
      </div>

      <Pole label="Lhůta na potvrzení" hint="minut, než nepotvrzená rezervace uvolní místo">
        <Input type="number" min="5" max="180" value={form.pending_ttl_minutes}
          onChange={(e) => zmen("pending_ttl_minutes")(e.target.value)} />
      </Pole>

      <div className="mt-6 mb-4">
        <Prepinac checked={form.is_published} onChange={zmen("is_published")}
          label="Publikovat" hint="dokud není zaškrtnuto, stránka akce vrací 404 a registrovat se nedá" />
        <Prepinac checked={form.show_on_homepage} onChange={zmen("show_on_homepage")}
          label="Ukázat na titulce" hint="vypni u zkušebních akcí nebo když chceš vypíchnout jinou" />
      </div>

      {chyba && <p className="mb-4 text-xs text-red-400/90">{chyba}</p>}
      {hotovo && <p className="mb-4 text-xs text-emerald-400/80">Uloženo.</p>}

      <Button type="submit" size="lg" disabled={ukladam}>
        {ukladam && <Loader2 className="h-4 w-4 animate-spin" />}
        {event ? "Uložit změny" : "Založit akci"}
      </Button>
    </form>
  );
}
