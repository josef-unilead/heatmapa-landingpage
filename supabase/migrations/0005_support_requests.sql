-- ============================================================================
-- Dotazy ze zákaznické podpory (/support).
--
-- Na rozdíl od starších tabulek formulářů (waitlist, partner_inquiries) sem
-- prohlížeč nezapisuje. Formulář posílá POST na /api/support, protože kromě
-- uložení má odejít i e-mail na support@heatmapa.com, a k tomu je potřeba
-- klíč k Resendu, který na klientovi být nesmí. Zapisuje tedy jen server
-- service rolí, přesně jako u rezervací.
--
-- Migrace je psaná idempotentně, opakované spuštění nevadí.
-- ============================================================================

create table if not exists public.support_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) between 3 and 200),
  subject     text not null check (char_length(subject) between 1 and 200),
  message     text not null check (char_length(message) between 1 and 2000),
  -- IP se nikdy neukládá v čitelné podobě, jen jako HMAC se solí. Slouží
  -- výhradně k rate limitu, viz hashIp() v api/_lib/http.js.
  ip_hash     text,
  -- Odešel notifikační e-mail na podporu? Když Resend selže, dotaz v tabulce
  -- zůstane s hodnotou false, takže se nikomu neztratí.
  notified    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Pro vyřizování dotazů se v tabulce kouká od nejnovějšího.
create index if not exists support_requests_created_idx
  on public.support_requests (created_at desc);

-- Rate limit se ptá "kolik dotazů přišlo z téhle IP za poslední hodinu".
create index if not exists support_requests_ip_idx
  on public.support_requests (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Žádná policy tu záměrně není: se zapnutým RLS a bez policy k tabulce
-- anonymní klíč nemá přístup, ani na čtení, ani na zápis. Jsou v ní jména,
-- e-maily a text dotazů. Dostane se do ní jen service role, tedy serverová
-- funkce a Supabase dashboard.
-- ---------------------------------------------------------------------------
alter table public.support_requests enable row level security;

-- PostgREST si schéma drží v cache a o nové tabulce by se jinak dozvěděl až
-- po restartu.
notify pgrst, 'reload schema';
