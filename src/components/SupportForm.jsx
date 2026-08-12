import { useState, useRef } from "react";
import { CheckCircle, User, Mail, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import Turnstile from "./event/Turnstile";
import { useLang } from "../lib/i18n";
import { LIMITS, validateSupportRequest } from "../lib/support/validation";

export default function SupportForm() {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", gdpr: false });
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const lastSubmit = useRef(0);

  // Kódy chyb z validace na hotové věty. Server vrací stejné kódy pro stejná
  // pole, takže se to hodí na obojí.
  const fieldMessage = (code) =>
    ({
      required: t.supErrRequired,
      invalid: t.supErrInvalid,
      tooLong: t.supErrTooLong,
    })[code] ?? t.supErrInvalid;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Chyba u pole zmizí, jakmile do něj člověk začne psát.
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Honeypot
    if (honeypot) return;

    // Rate limit v prohlížeči. Ten skutečný je na serveru, tohle jen brání
    // dvojkliku na tlačítko.
    const now = Date.now();
    if (now - lastSubmit.current < 3000) {
      setError(t.supErrRate);
      return;
    }
    lastSubmit.current = now;

    const payload = {
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
      consentGdpr: form.gdpr,
      lang,
    };

    const { valid, errors } = validateSupportRequest(payload);
    if (!valid) {
      setFieldErrors(errors);
      setError(errors.consentGdpr ? t.gdprError : "");
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);

    let response;
    try {
      response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, turnstileToken, company: honeypot }),
      });
    } catch {
      setLoading(false);
      setError(t.supErrGeneral);
      return;
    }

    setLoading(false);

    // Token Turnstile je jednorázový, takže po neúspěchu je potřeba nový.
    if (!response.ok) {
      setTurnstileToken(null);
      setTurnstileReset((n) => n + 1);
    }

    if (response.ok) {
      setSubmitted(true);
      return;
    }

    const data = await response.json().catch(() => ({}));
    switch (data.error) {
      case "rate_limited":
        setError(t.supErrRate);
        break;
      case "challenge_failed":
        setError(t.supErrChallenge);
        break;
      case "validation":
        setFieldErrors(data.fields ?? {});
        break;
      default:
        setError(t.supErrGeneral);
    }
  }

  const fieldError = (name) =>
    fieldErrors[name] ? (
      <p className="mt-1.5 text-xs text-red-400/80">{fieldMessage(fieldErrors[name])}</p>
    ) : null;

  return (
    <section className="px-4 py-12 bg-black md:px-6 md:py-24">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {`${t.supTitle1} ${t.supHighlight}`}
        </h2>
        <p className="mb-8 text-base leading-7 text-neutral-400">{t.supSub}</p>

        {submitted ? (
          <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-8 shadow-[0_35px_80px_rgba(0,0,0,0.32)]">
            <CheckCircle className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-300">{t.supSuccess}</p>
            <p className="mt-1 text-xs text-neutral-500">{t.supSuccessDesc}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <div className="glass glass-card no-hover-card rounded-[32px] border border-white/10 bg-black/20 p-6 md:p-8 shadow-[0_35px_80px_rgba(0,0,0,0.32)]">
              {/* Honeypot */}
              <input
                type="text"
                name="company"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", opacity: 0 }}
              />

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.supName}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder={t.supNamePlaceholder} className="pl-10" maxLength={LIMITS.name} />
                </div>
                {fieldError("name")}
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.supEmail}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder={t.supEmailPlaceholder} className="pl-10" maxLength={LIMITS.email} />
                </div>
                {fieldError("email")}
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.supSubject}</label>
                <div className="relative">
                  <MessageSquare className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="text" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder={t.supSubjectPlaceholder} className="pl-10" maxLength={LIMITS.subject} />
                </div>
                {fieldError("subject")}
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.supMessage}</label>
                <Textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder={t.supMessagePlaceholder} rows={5} maxLength={LIMITS.message} />
                {fieldError("message")}
              </div>

              <div className="mb-6">
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={form.gdpr}
                      onChange={(e) => update("gdpr", e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/15 bg-white/5 transition-all checked:border-orange-500/50 checked:bg-orange-500/20 outline-none"
                    />
                    <svg
                      className="pointer-events-none absolute h-3 w-3 text-orange-400 opacity-0 peer-checked:opacity-100 transition-opacity"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {t.gdprConsent}{" "}
                    <Link to="/privacypolicy" className="text-orange-400/70 underline underline-offset-2 hover:text-orange-400">
                      {t.gdprLink}
                    </Link>
                  </span>
                </label>
              </div>

              <Turnstile
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                resetKey={turnstileReset}
              />

              {error && <p className="mb-4 text-xs text-red-400/80">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.supSubmitting : t.supSubmit}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-xs text-neutral-600">
          {t.supDirect}{" "}
          <a href="mailto:support@heatmapa.com" className="text-orange-400/70 underline underline-offset-2 transition-colors hover:text-orange-400">
            support@heatmapa.com
          </a>
        </p>
      </div>
    </section>
  );
}
