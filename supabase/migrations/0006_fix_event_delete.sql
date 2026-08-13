-- ============================================================================
-- Oprava: akci nešlo smazat.
--
-- Mazání akce kaskádou smaže i její rezervace. Nad rezervacemi ale visí
-- trigger, který po každé změně přepočítá počítadlo obsazenosti, a ten se
-- při tom pokusil vložit řádek do event_counters pro akci, která už v tabulce
-- events není. Cizí klíč to odmítl a celá transakce spadla na
--
--   insert or update on table "event_counters" violates foreign key
--   constraint "event_counters_event_id_fkey"
--
-- Výsledek: akce nešla smazat žádnou cestou. Projevilo by se to v administraci
-- při prvním pokusu o smazání a při úklidu zkušebních dat.
--
-- Oprava je jednořádková: počítadlo se přepočítává jen tehdy, když akce
-- pořád existuje. Když se maže, není co počítat, řádek počítadla stejně
-- odejde kaskádou s ní.
-- ============================================================================

create or replace function public.refresh_event_counter(p_event_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.event_counters (event_id, taken, updated_at)
  select p_event_id,
         (select count(*)
            from public.reservations r
           where r.event_id = p_event_id
             and (r.status in ('confirmed', 'checked_in')
                  or (r.status = 'pending' and r.pending_expires_at > now()))),
         now()
   where exists (select 1 from public.events where id = p_event_id)
  on conflict (event_id) do update
    set taken = excluded.taken, updated_at = excluded.updated_at;
$$;

revoke all on function public.refresh_event_counter(uuid) from public, anon, authenticated;
grant execute on function public.refresh_event_counter(uuid) to service_role;
