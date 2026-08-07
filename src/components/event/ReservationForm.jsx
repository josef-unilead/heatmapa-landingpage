// Registrační formulář na akci.
//
// Validace používá stejný modul jako server (src/lib/ticketing/validation.js),
// takže se nemůže stát, že by formulář pustil dál něco, co server odmítne.
// Chyby se ukazují pod polem hned po opuštění pole, ne až po odeslání.
//
// Pole i tlačítka jsou stávající komponenty webu, žádné vlastní styly.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, User, Phone, AtSign } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useLang } from "../../lib/i18n";
import { validateReservation } from "../../lib/ticketing/validation";
import Turnstile from "./Turnstile";

const RESEND_COOLDOWN_S = 60;
const MAX_RESENDS = 3;

const EMPTY = {
  firstName: "", lastName: "", email: "", phone: "",
  consentGdpr: false, consentMarketing: false,
};

/** Chybové kódy ze sdílené validace na věty v aktuálním jazyce. */
function errorText(t, code) {
  // Bez kódu není co hlásit. Kdyby se tady spadlo do výchozí větve, svítila
  // by hláška i u správně vyplněného pole.
  if (!code) return null;
  switch (code) {
    case "required": return t.ev.errRequired;
    case "tooLong": return t.ev.errTooLong;
    case "disposable": return t.ev.errDisposable;
    default: return t.ev.errInvalid;
  }
}

/** Zaškrtávátko ve stejné podobě jako jinde na webu, včetně fajfky. */
function Consent({ checked, onChange, onBlur, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/15 bg-white/5 transition-all outline-none checked:border-orange-500/50 checked:bg-orange-500/20"
        />
        <svg
          className="pointer-events-none absolute h-3 w-3 text-orange-400 opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-xs leading-relaxed text-neutral-500">{children}</span>
    </label>
  );
}

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="mb-3">
      <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
        {children}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400/90">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Obrazovka po odeslání
// ---------------------------------------------------------------------------
function CheckEmail({ slug, email }) {
  const { t } = useLang();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_S);
  const [sentCount, setSentCount] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    setSending(true);
    try {
      await fetch("/api/reservations/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
    } catch {
      // Odpověď je stejně vždy neutrální, takže není co hlásit.
    }
    setSending(false);
    setSentCount((c) => c + 1);
    setSecondsLeft(RESEND_COOLDOWN_S);
  }

  const exhausted = sentCount >= MAX_RESENDS;

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
        <Mail className="h-5 w-5 text-orange-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{t.ev.checkTitle}</h3>
      <p className="mx-auto mb-2 max-w-sm text-sm leading-relaxed text-neutral-400">
        {t.ev.checkBody}
      </p>
      <p className="mb-6 text-xs text-neutral-600">{t.ev.checkSpam}</p>

      {exhausted ? (
        <p className="text-xs text-neutral-500">{t.ev.resendLimit}</p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={secondsLeft > 0 || sending}
          onClick={resend}
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          {secondsLeft > 0
            ? t.ev.resendIn.replace("{n}", secondsLeft)
            : t.ev.resend}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulář
// ---------------------------------------------------------------------------
export default function ReservationForm({ slug, onReserved }) {
  const { t, lang } = useLang();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const [formToken, setFormToken] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  // Honeypot. Pro člověka je neviditelný, vyplnit ho může jen něco, co
  // poslušně vyplňuje všechna pole v HTML.
  const honeypot = useRef("");

  // Nonce se bere ze serveru, protože nese čas vykreslení formuláře. Podle ní
  // server pozná, jestli odeslání přišlo dřív než za 2,5 sekundy.
  useEffect(() => {
    let active = true;
    fetch(`/api/events/${slug}`)
      .then((r) => r.json())
      .then((data) => active && setFormToken(data.formToken ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const { errors: next } = validateReservation({ ...form, [field]: value, lang });
      setErrors((prev) => ({ ...prev, [field]: next[field] }));
    }
  }

  function blur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: next } = validateReservation({ ...form, lang });
    setErrors((prev) => ({ ...prev, [field]: next[field] }));
  }

  async function submit(event) {
    event.preventDefault();
    setFormError("");

    const { valid, errors: found } = validateReservation({ ...form, lang });
    if (!valid) {
      setErrors(found);
      setTouched({
        firstName: true, lastName: true, email: true, phone: true, consentGdpr: true,
      });
      return;
    }

    setSending(true);
    let response;
    try {
      response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug,
          lang,
          formToken,
          turnstileToken,
          website: honeypot.current,
        }),
      });
    } catch {
      setSending(false);
      setFormError(t.ev.errGeneral);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setSending(false);

    if (data.ok) {
      setDone(true);
      onReserved?.();
      return;
    }

    // Token Turnstile je jednorázový, takže po neúspěchu je potřeba nový.
    setTurnstileToken(null);
    setTurnstileReset((n) => n + 1);

    if (data.error === "validation" && data.fields) {
      setErrors(data.fields);
      setTouched({
        firstName: true, lastName: true, email: true, phone: true, consentGdpr: true,
      });
      return;
    }

    setFormError({
      sold_out: t.ev.errSoldOut,
      closed: t.ev.errClosed,
      ip_limit: t.ev.errIpLimit,
      rate_limited: t.ev.errRate,
      challenge_failed: t.ev.errChallenge,
      stale_form: t.ev.errStale,
    }[data.error] ?? t.ev.errGeneral);

    // Prošlá nonce se musí vyměnit, jinak by druhý pokus selhal taky.
    if (data.error === "stale_form") {
      fetch(`/api/events/${slug}`)
        .then((r) => r.json())
        .then((fresh) => setFormToken(fresh.formToken ?? null))
        .catch(() => {});
    }
  }

  if (done) return <CheckEmail slug={slug} email={form.email} />;

  return (
    <form onSubmit={submit} noValidate>
      {/* Past na roboty. Schované mimo obrazovku, ne přes display:none,
          protože část botů skrytá pole pozná a přeskočí je. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        onChange={(e) => (honeypot.current = e.target.value)}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
      />

      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label={t.ev.firstName} icon={User} error={touched.firstName && errorText(t, errors.firstName)}>
          <Input
            type="text" value={form.firstName} autoComplete="given-name" maxLength={60}
            placeholder={t.ev.firstNamePlaceholder} className="pl-10"
            onChange={(e) => update("firstName", e.target.value)}
            onBlur={() => blur("firstName")}
          />
        </Field>

        <Field label={t.ev.lastName} icon={User} error={touched.lastName && errorText(t, errors.lastName)}>
          <Input
            type="text" value={form.lastName} autoComplete="family-name" maxLength={60}
            placeholder={t.ev.lastNamePlaceholder} className="pl-10"
            onChange={(e) => update("lastName", e.target.value)}
            onBlur={() => blur("lastName")}
          />
        </Field>
      </div>

      <Field label={t.ev.email} icon={AtSign} error={touched.email && errorText(t, errors.email)}>
        <Input
          type="email" value={form.email} autoComplete="email" maxLength={200}
          inputMode="email" placeholder={t.ev.emailPlaceholder} className="pl-10"
          onChange={(e) => update("email", e.target.value)}
          onBlur={() => blur("email")}
        />
      </Field>

      <Field label={t.ev.phone} icon={Phone} error={touched.phone && errorText(t, errors.phone)}>
        <Input
          type="tel" value={form.phone} autoComplete="tel" maxLength={20}
          inputMode="tel" placeholder={t.ev.phonePlaceholder} className="pl-10"
          onChange={(e) => update("phone", e.target.value)}
          onBlur={() => blur("phone")}
        />
      </Field>

      <div className="mt-5 mb-2">
        <Consent
          checked={form.consentGdpr}
          onChange={(value) => update("consentGdpr", value)}
          onBlur={() => blur("consentGdpr")}
        >
          {t.ev.consentGdpr}{" "}
          <Link to="/privacypolicy" className="text-orange-400/70 underline underline-offset-2 hover:text-orange-400">
            {t.ev.consentGdprLink}
          </Link>{" "}
          heatmapa s.r.o.
        </Consent>
        {touched.consentGdpr && errors.consentGdpr && (
          <p className="mt-1.5 ml-8 text-xs text-red-400/90">{t.ev.errConsent}</p>
        )}
      </div>

      <div className="mb-5">
        <Consent
          checked={form.consentMarketing}
          onChange={(value) => update("consentMarketing", value)}
        >
          {t.ev.consentMarketing}
        </Consent>
      </div>

      <Turnstile
        onToken={setTurnstileToken}
        onExpire={() => setTurnstileToken(null)}
        resetKey={turnstileReset}
      />

      {formError && <p className="mb-4 text-xs text-red-400/90">{formError}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={sending}>
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        {sending ? t.ev.submitting : t.ev.submit}
      </Button>
    </form>
  );
}
