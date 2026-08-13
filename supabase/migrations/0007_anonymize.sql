-- ============================================================================
-- Anonymizace osobních údajů 90 dní po akci.
--
-- Osobní údaje se nesmí držet déle, než je potřeba. Devadesát dní po konci
-- akce už není důvod vědět, kdo přišel: reklamace i účetní dotazy jsou dávno
-- vyřízené a k ničemu dalšímu ta data nejsou.
--
-- Rezervace se nemažou, jen se z nich vyjmou osobní údaje. Zůstávají časy
-- a stavy, takže statistika návštěvnosti dál sedí, ale nejde z ní zjistit,
-- kdo to byl.
--
-- Zástupné hodnoty musí být pro každý řádek jiné. Unikátní index na
-- (event_id, email_normalized) totiž platí i pro potvrzené a odbavené
-- rezervace, což jsou po akci skoro všechny, a jedna společná hodnota
-- typu "anonymizovano" by ho porušila hned u druhého řádku.
-- ============================================================================

create or replace function public.anonymize_old_reservations(p_days integer default 90)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  with stare as (
    select r.id
      from public.reservations r
      join public.events e on e.id = r.event_id
     where r.anonymized_at is null
       and coalesce(e.ends_at, e.starts_at) < now() - make_interval(days => p_days)
  )
  update public.reservations r
     set first_name       = 'Anonymizováno',
         last_name        = '',
         email            = 'anon-' || r.id || '@invalid',
         email_normalized = 'anon-' || r.id || '@invalid',
         phone_e164       = 'anon-' || r.id,
         ip_hash          = null,
         ua_hash          = null,
         confirm_token_hash = null,
         anonymized_at    = now()
    from stare
   where r.id = stare.id;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.anonymize_old_reservations(integer) from public, anon, authenticated;
grant execute on function public.anonymize_old_reservations(integer) to service_role;

comment on function public.anonymize_old_reservations is
  'Vyjme osobní údaje z rezervací na akce starší než zadaný počet dní. Vrací počet upravených řádků.';
