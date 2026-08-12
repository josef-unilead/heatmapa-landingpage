-- ============================================================================
-- Přepínač "ukazovat na homepage".
--
-- Dosud platilo, že publikovaná akce se automaticky objeví i v sekci na
-- titulce. To nestačí ve dvou případech:
--
--   1. Zkušební akce, na které se má dát projít celý průchod, ale nemá se
--      ukázat návštěvníkům.
--   2. Víc souběžných akcí, kdy chceš na titulce vypíchnout jen jednu.
--
-- Výchozí hodnota je true, takže se chování existujících akcí nemění.
-- ============================================================================

alter table public.events
  add column if not exists show_on_homepage boolean not null default true;

comment on column public.events.show_on_homepage is
  'Publikovaná akce s false je dostupná na své adrese, ale neobjeví se v sekci na homepage.';

-- PostgREST si schéma drží v cache a o novém sloupci by se jinak dozvěděl
-- až po restartu. Bez tohohle vrací "Could not find the column in the
-- schema cache", i když sloupec v databázi je.
notify pgrst, 'reload schema';
