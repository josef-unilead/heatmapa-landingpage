// Regrese: neúspěšný pokus nesmí spálit nonce formuláře.
//
// Tohle lidem bralo e-maily. Nonce se spotřebovávala hned po ověření podpisu,
// tedy před Turnstilem i před validací. Jakékoli první selhání ji spálilo,
// třeba překlep v e-mailu nebo widget, který ještě nestihl vydat token.
// Druhý pokus pak narazil na "už použitá", a protože se to navenek tváří
// jako úspěch (aby přes formulář nešlo zjišťovat seznam registrovaných),
// člověk uviděl "Zkontroluj si e-mail" a žádný nedostal.
//
// Test jde přes HTTP, ne přes prohlížeč: kontroluje se chování serveru,
// a jde to rychleji a spolehlivěji než klikat ve formuláři.
//
// Spuštění:  npm run test:retry
// Potřebuje běžící dev API s testovacím klíčem Turnstile:
//   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA npm run dev:api

import { createClient } from "@supabase/supabase-js";

const API = process.env.RETRY_API ?? "http://localhost:3001/api";
const SLUG = "what-the-f3ck-is-heatmapa";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

// Resend odmítá example.com. Kam se má opravdu odeslat, musí jít na jeho
// testovací adresu, jinak by test spadl na chování Resendu a ne na našem.
const DORUCITELNY = "delivered@resend.dev";

let selhalo = 0;
const check = (popis, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"}  ${popis}${detail ? `   ${detail}` : ""}`);
  if (!ok) selhalo++;
};

const nonce = async () =>
  (await (await fetch(`${API}/events/${SLUG}`)).json()).formToken;

const odesli = (telo) =>
  fetch(`${API}/reservations/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: SLUG, turnstileToken: "test", ...telo }),
  }).then(async (r) => ({ status: r.status, ...(await r.json()) }));

const ZAKLAD = {
  firstName: "Zkouška", lastName: "Opakování",
  phone: "777222333", consentGdpr: true,
};

// Server odmítá odeslání dřív než 2,5 s po vydání nonce.
const pockej = () => new Promise((r) => setTimeout(r, 3000));

// ── 1. Překlep v e-mailu, pak oprava se stejnou nonce ───────────────────────
{
  const email = DORUCITELNY;
  const formToken = await nonce();
  await pockej();

  const prvni = await odesli({ ...ZAKLAD, email: "tohle-neni-email", formToken });
  check("první pokus s překlepem odmítnut", prvni.status === 422, `HTTP ${prvni.status}`);

  const druhy = await odesli({ ...ZAKLAD, email, formToken });
  check("druhý pokus se stejnou nonce projde", druhy.ok === true, `HTTP ${druhy.status}`);

  const { data } = await db.from("reservations")
    .select("status, last_email_at").eq("email", email).maybeSingle();
  check("rezervace vznikla", Boolean(data), data ? `stav ${data.status}` : "NEVZNIKLA");
  check("e-mail odešel", Boolean(data?.last_email_at));
  await db.from("reservations").delete().eq("email", email);
}

// ── 2. Chybějící ověření, pak platné se stejnou nonce ───────────────────────
{
  const email = DORUCITELNY;
  const formToken = await nonce();
  await pockej();

  const prvni = await odesli({ ...ZAKLAD, email, formToken, turnstileToken: null });
  check("odeslání bez ověření odmítnuto", prvni.error === "challenge_failed", prvni.error ?? "");

  const druhy = await odesli({ ...ZAKLAD, email, formToken });
  check("po doplnění ověření to projde", druhy.ok === true, `HTTP ${druhy.status}`);

  const { data } = await db.from("reservations")
    .select("last_email_at").eq("email", email).maybeSingle();
  check("e-mail odešel", Boolean(data?.last_email_at));
  await db.from("reservations").delete().eq("email", email);
}

// ── 3. Nonce se pořád smí použít jen jednou ─────────────────────────────────
{
  const emailA = DORUCITELNY;
  const emailB = `retry-c2-${Date.now()}@example.com`;
  const formToken = await nonce();
  await pockej();

  const prvni = await odesli({ ...ZAKLAD, email: emailA, formToken });
  check("první úspěšné odeslání projde", prvni.ok === true);

  await odesli({ ...ZAKLAD, email: emailB, formToken });
  const { data } = await db.from("reservations").select("id").eq("email", emailB).maybeSingle();
  check("zopakování téže nonce nic nezaloží", !data, data ? "VZNIKLA DRUHÁ REZERVACE" : "");

  await db.from("reservations").delete().in("email", [emailA, emailB]);
}

const { data: ev } = await db.from("events").select("id").eq("slug", SLUG).single();
await db.from("signup_attempts").delete().gte("created_at", new Date(Date.now() - 600e3).toISOString());
await db.rpc("refresh_event_counter", { p_event_id: ev.id });

console.log(selhalo ? `\n  NEPROŠLO: ${selhalo} kontrol\n` : "\n  Všechny kontroly prošly.\n");
process.exit(selhalo ? 1 : 0);
