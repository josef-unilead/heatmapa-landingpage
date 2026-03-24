import { useState } from "react";
import { CheckCircle, User, Mail, FileText, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";

export default function JobApplicationForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    message: "",
    portfolio: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Vyplňte prosím jméno.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Zadejte platný e-mail.");
      return;
    }
    if (!form.position.trim()) {
      setError("Vyberte pozici, o kterou máte zájem.");
      return;
    }
    if (!form.message.trim()) {
      setError("Napište nám něco o sobě.");
      return;
    }

    setError("");
    setLoading(true);

    // TODO: Replace with Supabase call
    // const { error } = await supabase.from("job_applications").insert([{
    //   name: form.name,
    //   email: form.email,
    //   position: form.position,
    //   message: form.message,
    //   portfolio: form.portfolio || null,
    // }]);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-lg text-center">
        <Badge className="mb-4">Přidej se k nám</Badge>

        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Pošli nám přihlášku
        </h2>

        <p className="mb-8 text-neutral-400">
          Zaujala tě některá z pozic? Vyplň formulář a my se ti ozveme.
        </p>

        {submitted ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
            <p className="text-lg font-semibold text-white">Přihláška odeslána!</p>
            <p className="mt-1 text-sm text-neutral-400">
              Díky za zájem. Ozveme se ti co nejdříve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
              {/* Name */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-white">
                  Jméno <span className="text-orange-400">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jan Novák"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-white">
                  E-mail <span className="text-orange-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jan@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Position */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-white">
                  Pozice <span className="text-orange-400">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-neutral-700 bg-neutral-800 py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30"
                  >
                    <option value="" disabled>
                      Vyber pozici
                    </option>
                    <option value="ambassador">Ambassador</option>
                    <option value="social-media">Social Media Manager</option>
                    <option value="other">Jiná pozice</option>
                  </select>
                </div>
              </div>

              {/* Portfolio / LinkedIn */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-white">
                  Portfolio / LinkedIn
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    (nepovinné)
                  </span>
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                  <Input
                    type="url"
                    value={form.portfolio}
                    onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                    placeholder="https://linkedin.com/in/jan-novak"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-white">
                  O tobě <span className="text-orange-400">*</span>
                </label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Řekni nám něco o sobě, svých zkušenostech a proč tě Heatmapa zajímá..."
                  rows={4}
                />
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-400">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Odesílám..." : "Odeslat přihlášku"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
