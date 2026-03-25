import { useState, useRef } from "react";
import { CheckCircle, User, Mail, FileText, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useLang } from "../lib/i18n";
import { supabase } from "../lib/supabase";

const VALID_POSITIONS = ["ambassador-social-media", "other"];

function sanitize(str, maxLength = 200) {
  return str.trim().slice(0, maxLength);
}

export default function JobApplicationForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", email: "", position: "", message: "", portfolio: "" });
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const lastSubmit = useRef(0);

  async function handleSubmit(e) {
    e.preventDefault();

    // Honeypot
    if (honeypot) return;

    // Rate limit
    const now = Date.now();
    if (now - lastSubmit.current < 10000) {
      setError(t.jfErrRate || "Počkej chvíli před dalším odesláním.");
      return;
    }
    lastSubmit.current = now;

    const name = sanitize(form.name, 100);
    const email = sanitize(form.email, 200).toLowerCase();
    const position = sanitize(form.position, 50);
    const message = sanitize(form.message, 2000);
    const portfolio = sanitize(form.portfolio, 500);

    if (!name) { setError(t.jfErrName); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t.jfErrEmail); return; }
    if (!VALID_POSITIONS.includes(position)) { setError(t.jfErrPos); return; }
    if (!message) { setError(t.jfErrMsg); return; }

    setError("");
    setLoading(true);

    const { error: dbError } = await supabase.from("job_applications").insert([
      {
        name,
        email,
        position,
        message,
        portfolio: portfolio || null,
      },
    ]);

    setLoading(false);

    if (dbError) {
      setError(t.jfErrGeneral || "Něco se pokazilo. Zkus to znovu.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <section className="px-4 py-12 md:px-6 md:py-24">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="mb-3 text-xl font-light tracking-wide text-neutral-500 md:text-2xl">
          {t.jfTitle1} <span className="font-medium bg-linear-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.jfHighlight}</span>
        </h2>
        <p className="mb-8 text-sm text-neutral-600">{t.jfSub}</p>

        {submitted ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
            <CheckCircle className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-300">{t.jfSuccess}</p>
            <p className="mt-1 text-xs text-neutral-500">{t.jfSuccessDesc}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8">
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
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.jfName}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jan Novák" className="pl-10" maxLength={100} />
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.jfEmail}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jan@example.com" className="pl-10" maxLength={200} />
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.jfPosition}</label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-white/5 backdrop-blur-md py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/10"
                  >
                    <option value="" disabled>{t.jfPositionPlaceholder}</option>
                    <option value="ambassador-social-media">{t.jfPosAmbassador}</option>
                    <option value="other">{t.jfPosOther}</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">
                  {t.jfPortfolio} <span className="ml-2 normal-case tracking-normal text-neutral-600">{t.jfPortfolioOpt}</span>
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="url" value={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.value })} placeholder="https://linkedin.com/in/jan-novak" className="pl-10" maxLength={500} />
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.jfAbout}</label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t.jfAboutPlaceholder} rows={4} maxLength={2000} />
              </div>

              {error && <p className="mb-4 text-xs text-red-400/80">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.jfSubmitting : t.jfSubmit}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
