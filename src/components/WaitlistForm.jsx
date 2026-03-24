import { useState, useRef } from "react";
import { CheckCircle, User, Mail, Hash } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { useLang } from "../lib/i18n";
import { supabase } from "../lib/supabase";

const VALID_ROLES = ["creator", "business", "explorer"];

function sanitize(str, maxLength = 200) {
  return str.trim().slice(0, maxLength);
}

export default function WaitlistForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", email: "", ico: "", roles: [] });
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const lastSubmit = useRef(0);

  const roles = [
    { id: "creator", label: t.wlRole1, description: t.wlRole1Desc },
    { id: "business", label: t.wlRole2, description: t.wlRole2Desc },
    { id: "explorer", label: t.wlRole3, description: t.wlRole3Desc },
  ];

  function toggleRole(roleId) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter((r) => r !== roleId)
        : [...prev.roles, roleId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Honeypot
    if (honeypot) return;

    // Rate limit
    const now = Date.now();
    if (now - lastSubmit.current < 10000) {
      setError(t.wlErrRate || "Počkej chvíli před dalším odesláním.");
      return;
    }
    lastSubmit.current = now;

    const name = sanitize(form.name, 100);
    const email = sanitize(form.email, 200).toLowerCase();
    const ico = sanitize(form.ico, 8);
    const safeRoles = form.roles.filter((r) => VALID_ROLES.includes(r));

    if (!name) { setError(t.wlErrName); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t.wlErrEmail); return; }
    if (ico && !/^\d{1,8}$/.test(ico)) { setError(t.wlErrIco || "IČO musí obsahovat pouze čísla."); return; }
    if (safeRoles.length === 0) { setError(t.wlErrRole); return; }

    setError("");
    setLoading(true);

    const { error: dbError } = await supabase.from("waitlist").insert([
      {
        name,
        email,
        ico: ico || null,
        roles: safeRoles,
      },
    ]);

    setLoading(false);

    if (dbError) {
      if (dbError.code === "23505") {
        setError(t.wlErrDuplicate || "Tento e-mail je už na waitlistu.");
      } else {
        setError(t.wlErrGeneral || "Něco se pokazilo. Zkus to znovu.");
      }
      return;
    }

    setSubmitted(true);
  }

  return (
    <section className="relative overflow-hidden px-6 py-24">
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <h2 className="mb-3 text-xl font-light tracking-wide text-neutral-500 md:text-2xl">
          {t.wlTitle1} <span className="font-medium bg-gradient-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">{t.wlHighlight}</span>
        </h2>
        <p className="mb-8 text-sm text-neutral-600">{t.wlSub}</p>

        {submitted ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
            <CheckCircle className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-300">{t.wlSuccess}</p>
            <p className="mt-1 text-xs text-neutral-500">{t.wlSuccessDesc}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8">
              {/* Honeypot */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", opacity: 0 }}
              />

              <div className="mb-6">
                <label className="mb-3 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.wlWho}</label>
                <div className="flex flex-col gap-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all ${
                        form.roles.includes(role.id)
                          ? "border-white/20 bg-white/10"
                          : "border-white/8 bg-white/3 hover:border-white/15"
                      }`}
                    >
                      <Checkbox checked={form.roles.includes(role.id)} onChange={() => {}} tabIndex={-1} />
                      <div>
                        <p className="text-sm font-medium text-neutral-300">{role.label}</p>
                        <p className="text-xs text-neutral-600">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.wlName}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jan Novák" className="pl-10" maxLength={100} />
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">{t.wlEmail}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jan@example.com" className="pl-10" maxLength={200} />
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-400 uppercase">
                  {t.wlIco} <span className="ml-2 normal-case tracking-normal text-neutral-600">{t.wlIcoOpt}</span>
                </label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <Input
                    type="text"
                    value={form.ico}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, ico: val });
                    }}
                    placeholder="12345678"
                    className="pl-10"
                    maxLength={8}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {error && <p className="mb-4 text-xs text-red-400/80">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.wlSubmitting : t.wlSubmit}
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-neutral-700">{t.wlSpam}</p>
          </form>
        )}
      </div>
    </section>
  );
}
