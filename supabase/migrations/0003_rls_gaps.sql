-- ============================================================================
-- Dvě mezery, které našel bezpečnostní advisor v Supabase.
--
-- Obojí je z migrací 0001 a 0002. Advisor je dobrý druhý pár očí, protože
-- kouká na hotový stav databáze a ne na to, co jsem měl v úmyslu.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Evidence proběhlých migrací neměla zapnuté RLS.
--
-- Zakládá si ji scripts/db-migrate.mjs a zapomněl jsem na ni. Nejsou v ní
-- osobní údaje, jen názvy souborů, ale bez RLS do ní může anonymní klíč
-- zapisovat. Číst ji potřebuje jenom migrační skript, který jede pod přímým
-- připojením, takže stačí RLS zapnout a žádnou policy nepřidávat.
-- ---------------------------------------------------------------------------
alter table public._migrations enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Trigger funkce zůstala volatelná rolí PUBLIC.
--
-- V migraci 0002 jsem odebral práva create_reservation, confirm_reservation
-- a refresh_event_counter, ale na tuhle jsem zapomněl. Zavolat trigger funkci
-- napřímo stejně skončí chybou, takže reálné riziko je nulové, ale nechávat
-- otevřená práva bez důvodu je zbytečné.
-- ---------------------------------------------------------------------------
revoke all on function public.reservations_counter_trigger() from public, anon, authenticated;
grant execute on function public.reservations_counter_trigger() to service_role;

-- ---------------------------------------------------------------------------
-- Poznámka ke zbylým hlášením advisoru, ať se k tomu nikdo nevrací:
--
-- "Public Can Execute SECURITY DEFINER Function: event_availability"
--   je záměr. Počet volných míst musí přečíst každý návštěvník ještě před
--   registrací. Funkce vrací jen kapacitu a počet obsazených míst, žádný
--   osobní údaj, a číst rezervace přitom anonymní klíč nesmí.
--
-- "RLS Policy Always True" na waitlist, job_applications a partner_inquiries
--   jsou starší tabulky s policy pouze na INSERT. Číst je anonymní klíč
--   nemůže, protože žádná policy na SELECT neexistuje. Nepodmíněná podmínka
--   pro zápis je u veřejného formuláře správně.
-- ---------------------------------------------------------------------------
