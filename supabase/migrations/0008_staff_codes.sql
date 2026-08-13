-- ============================================================================
-- Přístupové kódy obsluhy.
--
-- Tabulka měla vzniknout hned v migraci 0001, ale vypadla z ní. Projevilo se
-- to až v administraci hláškou "Could not find the table public.staff_codes".
--
-- Kódem se obsluha přihlásí do scanneru u vchodu. Ukládá se jen otisk, ne kód
-- sám: kdyby někdo získal přístup k datům, kódy z nich nesestaví. Zobrazí se
-- jedinkrát, při vytvoření.
--
-- Každý člověk dostane vlastní kód, aby šlo v logu odbavení poznat, kdo
-- vstupenku načetl, a aby se ztracený kód dal zneplatnit bez dopadu na
-- ostatní.
-- ============================================================================

create table if not exists public.staff_codes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  code_hash   text not null unique,
  label       text not null default 'Obsluha',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);

create index if not exists staff_codes_event on public.staff_codes (event_id)
  where is_active;

-- Přihlášení obsluhy hledá podle otisku kódu, ne podle akce.
create index if not exists staff_codes_hash on public.staff_codes (code_hash)
  where is_active;

-- Bez policy a se zapnutým RLS se k tabulce dostane jen service role, pod
-- kterou běží serverové funkce. Anonymní klíč z webu na ni nesmí vůbec.
alter table public.staff_codes enable row level security;

notify pgrst, 'reload schema';
