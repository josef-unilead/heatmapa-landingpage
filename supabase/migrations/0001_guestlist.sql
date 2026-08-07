-- ============================================================================
-- Guestlist na akce: schéma, indexy, RLS, atomické založení rezervace.
--
-- Migrace je psaná tak, aby šla pustit opakovaně (idempotentně), takže když
-- ji spustíš dvakrát, nic se nerozbije.
--
-- Klíčová myšlenka celého souboru: kapacitu nikdy nepočítá aplikace. Počítá ji
-- funkce create_reservation() uvnitř jedné transakce pod zámkem řádku akce.
-- Bez toho by při souběžných požadavcích vzniklo víc rezervací než je míst.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Stavy rezervace
--
-- Zrušení má navíc důvod, protože rozlišujeme zrušení uživatelem od vypršení
-- lhůty na potvrzení. Kdyby vypršení bylo samostatným stavem, rozbila by se
-- podmínka unikátního indexu níž.
-- ---------------------------------------------------------------------------
do $$ begin
  create type reservation_status as enum
    ('pending', 'confirmed', 'checked_in', 'cancelled', 'revoked');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Akce
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id                      uuid primary key default gen_random_uuid(),
  -- Krátké číslo do QR tokenu. UUID by token zbytečně nafouklo.
  ref                     smallint generated always as identity unique,
  slug                    text not null unique,
  title                   text not null,
  perex                   text,
  description             text,
  cover_url               text,
  starts_at               timestamptz not null,
  ends_at                 timestamptz,
  venue_name              text not null,
  venue_address           text not null,
  capacity                integer not null default 100 check (capacity > 0),
  -- Do kdy jde registrovat. Null = až do začátku akce.
  registration_closes_at  timestamptz,
  -- Jak dlouho drží nepotvrzená rezervace místo.
  pending_ttl_minutes     integer not null default 30 check (pending_ttl_minutes > 0),
  is_published            boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rezervace
-- ---------------------------------------------------------------------------
create table if not exists public.reservations (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  -- To, co jde do QR kódu. Schválně jiná hodnota než primární klíč, aby
  -- token neprozrazoval nic o databázi.
  ticket_id           uuid not null default gen_random_uuid() unique,

  first_name          text not null,
  last_name           text not null,
  email               text not null,
  -- Malými písmeny, u gmailu bez teček a bez +tagu. Jen tohle se porovnává.
  email_normalized    text not null,
  phone_e164          text not null,
  lang                text not null default 'cs' check (lang in ('cs', 'en')),

  consent_gdpr        boolean not null,
  consent_marketing   boolean not null default false,
  consent_at          timestamptz not null default now(),

  status              reservation_status not null default 'pending',
  cancelled_reason    text check (cancelled_reason in ('user', 'expired', 'admin')),

  pending_expires_at  timestamptz not null,
  confirm_token_hash  text,
  confirm_expires_at  timestamptz,
  confirm_used_at     timestamptz,
  confirmed_at        timestamptz,
  checked_in_at       timestamptz,
  checked_in_by       text,
  cancelled_at        timestamptz,
  revoked_at          timestamptz,

  resend_count        integer not null default 0,
  last_email_at       timestamptz,

  -- Osobní údaje minimalizované: IP se ukládá jen jako HMAC se solí.
  ip_hash             text,
  ua_hash             text,
  anonymized_at       timestamptz,

  created_at          timestamptz not null default now()
);

-- Jeden e-mail a jeden telefon na akci, vynuceno databází.
-- Parciální: po zrušení nebo revokaci se smí registrovat znovu.
create unique index if not exists reservations_event_email_active
  on public.reservations (event_id, email_normalized)
  where status in ('pending', 'confirmed', 'checked_in');

create unique index if not exists reservations_event_phone_active
  on public.reservations (event_id, phone_e164)
  where status in ('pending', 'confirmed', 'checked_in');

create index if not exists reservations_event_status
  on public.reservations (event_id, status);

create index if not exists reservations_confirm_token
  on public.reservations (confirm_token_hash)
  where confirm_token_hash is not null;

create index if not exists reservations_ip
  on public.reservations (event_id, ip_hash)
  where ip_hash is not null;

-- ---------------------------------------------------------------------------
-- Pokusy o registraci: podklad pro rate limit podle IP.
-- Drží se i pokusy, které skončily odmítnutím, jinak by šel limit obejít.
-- ---------------------------------------------------------------------------
create table if not exists public.signup_attempts (
  id          bigserial primary key,
  event_id    uuid references public.events(id) on delete cascade,
  ip_hash     text not null,
  outcome     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists signup_attempts_ip_time
  on public.signup_attempts (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Jednorázová nonce formuláře.
-- Server ji vydá při vykreslení formuláře a přijme jen jednou. Díky tomu jde
-- ověřit, že mezi vykreslením a odesláním uplynulo 2,5 s až 30 min, aniž
-- bychom věřili hodinám v prohlížeči.
-- ---------------------------------------------------------------------------
create table if not exists public.form_tokens (
  jti         uuid primary key,
  event_id    uuid references public.events(id) on delete cascade,
  used_at     timestamptz not null default now()
);

create index if not exists form_tokens_used_at on public.form_tokens (used_at);

-- ---------------------------------------------------------------------------
-- Počítadlo obsazenosti.
--
-- Existuje jen proto, aby na něj šlo pověsit realtime odběr: anonymní klient
-- nesmí číst tabulku rezervací, protože jsou v ní osobní údaje. Hodnota je
-- odvozená triggerem, nikdy se nezadává ručně. Zobrazované číslo si klient
-- stejně vždy dotáhne funkcí event_availability(), tohle je jen signál
-- "něco se změnilo, přepočítej".
-- ---------------------------------------------------------------------------
create table if not exists public.event_counters (
  event_id    uuid primary key references public.events(id) on delete cascade,
  taken       integer not null default 0,
  updated_at  timestamptz not null default now()
);

create or replace function public.refresh_event_counter(p_event_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.event_counters (event_id, taken, updated_at)
  select p_event_id, count(*), now()
    from public.reservations
   where event_id = p_event_id
     and (status in ('confirmed', 'checked_in')
          or (status = 'pending' and pending_expires_at > now()))
  on conflict (event_id) do update
    set taken = excluded.taken, updated_at = excluded.updated_at;
$$;

create or replace function public.reservations_counter_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_event_counter(coalesce(new.event_id, old.event_id));
  return null;
end $$;

drop trigger if exists reservations_counter on public.reservations;
create trigger reservations_counter
  after insert or update or delete on public.reservations
  for each row execute function public.reservations_counter_trigger();

-- ---------------------------------------------------------------------------
-- Volná místa.
--
-- Počítá se vždy z tabulky rezervací, žádné uložené číslo. Obsazeno je:
-- potvrzené, odbavené a nepotvrzené, kterým ještě neuplynula lhůta.
-- ---------------------------------------------------------------------------
create or replace function public.event_availability(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug',      e.slug,
    'capacity',  e.capacity,
    'taken',     (select count(*) from public.reservations r
                   where r.event_id = e.id
                     and (r.status in ('confirmed', 'checked_in')
                          or (r.status = 'pending' and r.pending_expires_at > now()))),
    'closed',    (e.registration_closes_at is not null and now() > e.registration_closes_at)
                 or now() > e.starts_at
  )
  from public.events e
  where e.slug = p_slug and e.is_published;
$$;

-- ---------------------------------------------------------------------------
-- Založení rezervace: kontrola kapacity a zápis v jedné atomické operaci.
--
-- "select ... for update" na řádku akce serializuje souběžné požadavky na
-- tutéž akci. Bez toho by dvě paralelní transakce obě přečetly 99 obsazených
-- míst a obě vložily rezervaci. S tím čeká druhá na commit první.
--
-- Vrací jsonb, ne výjimku, aby aplikace uměla rozlišit důvod odmítnutí.
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_slug                text,
  p_first_name          text,
  p_last_name           text,
  p_email               text,
  p_email_normalized    text,
  p_phone_e164          text,
  p_lang                text,
  p_consent_marketing   boolean,
  p_confirm_token_hash  text,
  p_ip_hash             text,
  p_ua_hash             text,
  p_max_per_ip          integer default 3
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_event public.events%rowtype;
  v_taken integer;
  v_ip_count integer;
  v_id uuid;
  v_ticket_id uuid;
  v_expires timestamptz;
begin
  select * into v_event
    from public.events
   where slug = p_slug and is_published
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'event_not_found');
  end if;

  if (v_event.registration_closes_at is not null and now() > v_event.registration_closes_at)
     or now() > v_event.starts_at then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  -- Nepotvrzené rezervace po lhůtě uvolní místo. Děje se to tady, aby to
  -- proběhlo pod stejným zámkem jako kontrola kapacity.
  update public.reservations
     set status = 'cancelled', cancelled_at = now(), cancelled_reason = 'expired'
   where event_id = v_event.id
     and status = 'pending'
     and pending_expires_at <= now();

  if p_ip_hash is not null then
    select count(*) into v_ip_count
      from public.reservations
     where event_id = v_event.id
       and ip_hash = p_ip_hash
       and status in ('pending', 'confirmed', 'checked_in');

    if v_ip_count >= p_max_per_ip then
      return jsonb_build_object('ok', false, 'reason', 'ip_limit');
    end if;
  end if;

  select count(*) into v_taken
    from public.reservations
   where event_id = v_event.id
     and (status in ('confirmed', 'checked_in')
          or (status = 'pending' and pending_expires_at > now()));

  if v_taken >= v_event.capacity then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  v_expires := now() + make_interval(mins => v_event.pending_ttl_minutes);

  begin
    insert into public.reservations (
      event_id, first_name, last_name, email, email_normalized, phone_e164, lang,
      consent_gdpr, consent_marketing, pending_expires_at,
      confirm_token_hash, confirm_expires_at, ip_hash, ua_hash
    ) values (
      v_event.id, p_first_name, p_last_name, p_email, p_email_normalized, p_phone_e164,
      coalesce(p_lang, 'cs'), true, coalesce(p_consent_marketing, false), v_expires,
      p_confirm_token_hash, v_expires, p_ip_hash, p_ua_hash
    )
    returning id, ticket_id into v_id, v_ticket_id;
  exception when unique_violation then
    -- E-mail nebo telefon už na akci je. Volající tuhle informaci ven nepustí.
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
  end;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_id,
    'ticket_id', v_ticket_id,
    'expires_at', v_expires,
    'event', jsonb_build_object(
      'id', v_event.id, 'ref', v_event.ref, 'slug', v_event.slug, 'title', v_event.title,
      'starts_at', v_event.starts_at, 'venue_name', v_event.venue_name,
      'venue_address', v_event.venue_address
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Potvrzení rezervace.
--
-- Taky atomicky: podmínka ve where zajistí, že dvojklik na odkaz v e-mailu
-- překlopí stav jen jednou a druhé volání vrátí "už bylo potvrzeno".
-- ---------------------------------------------------------------------------
create or replace function public.confirm_reservation(p_token_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_res public.reservations%rowtype;
  v_event public.events%rowtype;
begin
  update public.reservations
     set status = 'confirmed', confirmed_at = now(), confirm_used_at = now()
   where confirm_token_hash = p_token_hash
     and status = 'pending'
     and confirm_expires_at > now()
  returning * into v_res;

  if found then
    select * into v_event from public.events where id = v_res.event_id;
    return jsonb_build_object('ok', true, 'first_time', true,
      'reservation', to_jsonb(v_res), 'event', to_jsonb(v_event));
  end if;

  -- Nepovedlo se. Zjistíme proč, ať umíme rozlišit vypršelý odkaz od
  -- opakovaného kliknutí.
  select * into v_res from public.reservations where confirm_token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into v_event from public.events where id = v_res.event_id;

  if v_res.status = 'confirmed' or v_res.status = 'checked_in' then
    return jsonb_build_object('ok', true, 'first_time', false,
      'reservation', to_jsonb(v_res), 'event', to_jsonb(v_event));
  end if;

  if v_res.status in ('cancelled', 'revoked') then
    return jsonb_build_object('ok', false, 'reason', 'cancelled');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'expired');
end $$;

-- ---------------------------------------------------------------------------
-- RLS
--
-- Rezervace nesmí anonymní klíč vidět vůbec, jsou v nich osobní údaje.
-- Zapisuje do nich jen server service rolí, která RLS obchází.
-- ---------------------------------------------------------------------------
alter table public.events          enable row level security;
alter table public.reservations    enable row level security;
alter table public.event_counters  enable row level security;
alter table public.signup_attempts enable row level security;
alter table public.form_tokens     enable row level security;

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated using (is_published);

drop policy if exists counters_public_read on public.event_counters;
create policy counters_public_read on public.event_counters
  for select to anon, authenticated using (
    exists (select 1 from public.events e where e.id = event_id and e.is_published)
  );

-- Na reservations, signup_attempts a form_tokens záměrně není žádná policy:
-- se zapnutým RLS a bez policy k nim anonymní klíč nemá přístup.

revoke all on function public.create_reservation from anon, authenticated;
revoke all on function public.confirm_reservation from anon, authenticated;
revoke all on function public.refresh_event_counter from anon, authenticated;
grant execute on function public.event_availability to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: klient poslouchá jen na počítadle, ne na rezervacích.
-- ---------------------------------------------------------------------------
-- undefined_object nastane na holém Postgresu bez Supabase, což je případ
-- testovací databáze. Tam realtime není a nevadí to.
do $$ begin
  alter publication supabase_realtime add table public.event_counters;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
