-- ============================================================================
-- Odbavení vstupenky u vchodu.
--
-- Nejcitlivější místo celého systému. U dveří stojí víc lidí s telefony,
-- signál je mizerný, obsluha skenuje rychle a jedna vstupenka nesmí projít
-- dvakrát ani omylem.
--
-- Klíčová myšlenka: stav se mění jedním UPDATE s podmínkou ve WHERE. Postgres
-- ho provede atomicky, takže ze dvou souběžných požadavků uspěje právě jeden
-- a druhý dostane nula řádků. Kdyby se nejdřív četlo a pak zapisovalo, oba by
-- viděly "potvrzeno" a oba by pustily.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Log každého pokusu, i neúspěšného.
--
-- Odmítnuté pokusy jsou to zajímavé: podle nich se pozná, jestli někdo zkouší
-- podvržené kódy, jestli se obsluha nesnaží odbavit zrušené vstupenky nebo
-- jestli se něco děje s jedním konkrétním telefonem.
-- ---------------------------------------------------------------------------
create table if not exists public.checkin_log (
  id              bigserial primary key,
  event_id        uuid references public.events(id) on delete cascade,
  reservation_id  uuid references public.reservations(id) on delete set null,
  staff_code_id   uuid references public.staff_codes(id) on delete set null,
  staff_label     text,
  result          text not null,
  -- online = naskenováno se sítí, offline = dosynchronizováno později,
  -- manual = obsluha našla podle jména a odbavila ručně
  source          text not null default 'online',
  -- Kdy to naskenoval telefon. U offline záznamů je dřív než created_at.
  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists checkin_log_event_time
  on public.checkin_log (event_id, created_at desc);

create index if not exists checkin_log_reservation
  on public.checkin_log (reservation_id);

alter table public.checkin_log enable row level security;

-- ---------------------------------------------------------------------------
-- Odbavení vstupenky.
--
-- Vrací vždycky přesný důvod, ne jen ano/ne. Obsluha u dveří musí vědět,
-- jestli má člověka poslat pryč, nebo jestli jde o vlastní překlep.
--
-- Idempotence: když tentýž scanner naskenuje tutéž vstupenku znovu do pár
-- sekund, bere se to jako úspěch, ne jako pokus o podvod. Stává se to běžně,
-- když se telefon zasekne nebo obsluha neví, jestli první sken prošel. Po
-- uplynutí toho okna už jde o "tuhle vstupenku někdo použil" a ta se hlásí
-- jako konflikt i s časem prvního odbavení a jménem.
-- ---------------------------------------------------------------------------
create or replace function public.check_in_ticket(
  p_ticket_id      uuid,
  p_event_ref      smallint,
  p_staff_code_id  uuid,
  p_staff_label    text,
  p_source         text default 'online',
  p_scanned_at     timestamptz default now(),
  p_idem_seconds   integer default 5
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_res   public.reservations%rowtype;
  v_event public.events%rowtype;
  v_result text;
  v_updated public.reservations%rowtype;
begin
  select * into v_res from public.reservations where ticket_id = p_ticket_id;

  if not found then
    insert into public.checkin_log (event_id, result, staff_code_id, staff_label, source, scanned_at)
    values (null, 'not_found', p_staff_code_id, p_staff_label, p_source, p_scanned_at);
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  select * into v_event from public.events where id = v_res.event_id;

  -- Vstupenka na jinou akci. Podpis sedí, ale patří jinam, což se stane
  -- pokaždé, když se ve stejném klubu konají dvě akce po sobě.
  if v_event.ref <> p_event_ref then
    insert into public.checkin_log (event_id, reservation_id, result, staff_code_id, staff_label, source, scanned_at)
    values (v_res.event_id, v_res.id, 'wrong_event', p_staff_code_id, p_staff_label, p_source, p_scanned_at);
    return jsonb_build_object('ok', false, 'result', 'wrong_event',
      'eventTitle', v_event.title);
  end if;

  -- Vlastní odbavení. Podmínka na status je to jediné, co brání dvojímu
  -- průchodu, a musí zůstat v UPDATE, ne v předchozím SELECT.
  update public.reservations
     set status = 'checked_in',
         checked_in_at = now(),
         checked_in_by = coalesce(p_staff_label, 'neznámá obsluha')
   where ticket_id = p_ticket_id
     and status = 'confirmed'
  returning * into v_updated;

  if found then
    insert into public.checkin_log (event_id, reservation_id, result, staff_code_id, staff_label, source, scanned_at)
    values (v_res.event_id, v_res.id, 'ok', p_staff_code_id, p_staff_label, p_source, p_scanned_at);

    return jsonb_build_object(
      'ok', true, 'result', 'ok',
      'firstName', v_updated.first_name, 'lastName', v_updated.last_name,
      'checkedInAt', v_updated.checked_in_at);
  end if;

  -- Neprošlo. Zjistíme proč, ať obsluha ví, co má člověku říct.
  select * into v_res from public.reservations where ticket_id = p_ticket_id;

  if v_res.status = 'checked_in' then
    -- Opakovaný sken toutéž obsluhou do pár sekund není podvod.
    --
    -- Rozhoduje jméno obsluhy, ne id jejího kódu: v logu i ve sloupci
    -- checked_in_by je uložené právě jméno a porovnávat se musí to, co tam
    -- reálně je. Rovnítko schválně, ne "is not distinct from", jinak by si
    -- dvě volání bez obsluhy odpovídala jako táž osoba.
    if p_staff_label is not null
       and v_res.checked_in_by = p_staff_label
       and v_res.checked_in_at > now() - make_interval(secs => p_idem_seconds) then
      return jsonb_build_object(
        'ok', true, 'result', 'ok', 'repeat', true,
        'firstName', v_res.first_name, 'lastName', v_res.last_name,
        'checkedInAt', v_res.checked_in_at);
    end if;

    insert into public.checkin_log (event_id, reservation_id, result, staff_code_id, staff_label, source, scanned_at)
    values (v_res.event_id, v_res.id, 'already_used', p_staff_code_id, p_staff_label, p_source, p_scanned_at);

    return jsonb_build_object(
      'ok', false, 'result', 'already_used',
      'firstName', v_res.first_name, 'lastName', v_res.last_name,
      'checkedInAt', v_res.checked_in_at, 'checkedInBy', v_res.checked_in_by);
  end if;

  v_result := case v_res.status
    when 'cancelled' then 'cancelled'
    when 'revoked'   then 'revoked'
    when 'pending'   then 'not_confirmed'
    else 'rejected' end;

  insert into public.checkin_log (event_id, reservation_id, result, staff_code_id, staff_label, source, scanned_at)
  values (v_res.event_id, v_res.id, v_result, p_staff_code_id, p_staff_label, p_source, p_scanned_at);

  return jsonb_build_object('ok', false, 'result', v_result,
    'firstName', v_res.first_name, 'lastName', v_res.last_name);
end $$;

-- ---------------------------------------------------------------------------
-- Vzetí odbavení zpět.
--
-- Na to, když obsluha naskenuje špatnou vstupenku nebo člověk couvne. Okno je
-- krátké schválně: po půl minutě už je člověk uvnitř a "vrácení" by znamenalo
-- jen díru v evidenci.
-- ---------------------------------------------------------------------------
create or replace function public.undo_check_in(
  p_ticket_id     uuid,
  p_staff_code_id uuid,
  p_staff_label   text,
  p_window_secs   integer default 30
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_res public.reservations%rowtype;
begin
  update public.reservations
     set status = 'confirmed', checked_in_at = null, checked_in_by = null
   where ticket_id = p_ticket_id
     and status = 'checked_in'
     and checked_in_at > now() - make_interval(secs => p_window_secs)
  returning * into v_res;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'too_late');
  end if;

  insert into public.checkin_log (event_id, reservation_id, result, staff_code_id, staff_label, source)
  values (v_res.event_id, v_res.id, 'undo', p_staff_code_id, p_staff_label, 'online');

  return jsonb_build_object('ok', true, 'result', 'undone',
    'firstName', v_res.first_name, 'lastName', v_res.last_name);
end $$;

revoke all on function public.check_in_ticket(uuid, smallint, uuid, text, text, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.undo_check_in(uuid, uuid, text, integer)
  from public, anon, authenticated;

grant execute on function public.check_in_ticket(uuid, smallint, uuid, text, text, timestamptz, integer)
  to service_role;
grant execute on function public.undo_check_in(uuid, uuid, text, integer) to service_role;

notify pgrst, 'reload schema';
