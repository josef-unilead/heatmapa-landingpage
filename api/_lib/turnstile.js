// Ověření Cloudflare Turnstile.
//
// Klient dostane od widgetu token a pošle ho s formulářem. Platnost potvrzuje
// výhradně tenhle server u Cloudflare, protože cokoli, co si ověří prohlížeč
// sám, umí bot přeskočit.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("Chybí TURNSTILE_SECRET_KEY");
  if (!token) return { ok: false, reason: "missing" };

  const form = new URLSearchParams({ secret, response: String(token) });
  if (remoteIp) form.set("remoteip", remoteIp);

  let data;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    data = await response.json();
  } catch (err) {
    // Když je Cloudflare nedostupný, registraci raději odmítneme. Propustit
    // všechno při výpadku ověřování je přesně to okno, které boti hledají.
    console.error("[turnstile] ověření selhalo:", err.message);
    return { ok: false, reason: "unavailable" };
  }

  if (!data.success) {
    return { ok: false, reason: (data["error-codes"] || []).join(",") || "rejected" };
  }
  return { ok: true };
}
