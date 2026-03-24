import { useState } from "react";
import { CheckCircle, User, Mail, Building2, Hash } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";

const roles = [
  { id: "creator", label: "Tvůrce akcí", description: "Pořádám eventy a akce" },
  { id: "business", label: "Business owner", description: "Vlastním podnik / provozovnu" },
  { id: "explorer", label: "Explorer", description: "Objevuji nová místa a zážitky" },
];

export default function WaitlistForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    ico: "",
    roles: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    if (!form.name.trim()) {
      setError("Vyplňte prosím jméno.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Zadejte platný e-mail.");
      return;
    }
    if (form.roles.length === 0) {
      setError("Vyberte alespoň jednu roli.");
      return;
    }

    setError("");
    setLoading(true);

    // TODO: Replace with Supabase call
    // const { error } = await supabase.from("waitlist").insert([{
    //   name: form.name,
    //   email: form.email,
    //   ico: form.ico || null,
    //   roles: form.roles,
    // }]);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <section className="relative overflow-hidden px-6 py-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-orange-500/6 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg text-center">
        <Badge className="mb-4">Early Access</Badge>

        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Buď první na mapě
        </h2>

        <p className="mb-8 text-neutral-400">
          Zaregistruj se do waitlistu a získej přístup dříve než ostatní.
        </p>

        {submitted ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
            <p className="text-lg font-semibold text-white">Jsi na seznamu!</p>
            <p className="mt-1 text-sm text-neutral-400">
              Ozveme se ti, jakmile spustíme early access.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
              {/* Role selection */}
              <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-white">
                  Kdo jsi? <span className="text-orange-400">*</span>
                </label>
                <div className="flex flex-col gap-3">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                        form.roles.includes(role.id)
                          ? "border-orange-500/40 bg-orange-500/5"
                          : "border-neutral-800 bg-neutral-800/40 hover:border-neutral-700"
                      }`}
                    >
                      <Checkbox
                        checked={form.roles.includes(role.id)}
                        onChange={() => {}}
                        tabIndex={-1}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{role.label}</p>
                        <p className="text-xs text-neutral-500">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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

              {/* IČO */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-white">
                  IČO
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    (nepovinné)
                  </span>
                </label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    type="text"
                    value={form.ico}
                    onChange={(e) => setForm({ ...form, ico: e.target.value })}
                    placeholder="12345678"
                    className="pl-10"
                    maxLength={8}
                  />
                </div>
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-400">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Odesílám..." : "Připojit se na waitlist"}
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-neutral-600">
              Žádný spam. Odhlásit se můžeš kdykoliv.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
