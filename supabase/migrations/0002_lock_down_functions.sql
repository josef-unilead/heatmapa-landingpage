-- ============================================================================
-- Uzamčení serverových funkcí.
--
-- Postgres dává každé nově vytvořené funkci EXECUTE roli PUBLIC. Odebrání
-- práv rolím anon a authenticated, jak to dělala migrace 0001, tenhle
-- implicitní grant nezruší, takže funkce zůstaly volatelné anonymním klíčem.
--
-- Anonymní klíč je veřejný, je zapečený v JavaScriptu webu a přečte si ho
-- kdokoli. Kdyby přes něj šlo zavolat create_reservation() přímo, obešel by
-- útočník Turnstile, nonce, rate limit i validaci a zaplnil všechna místa
-- jedním skriptem. Kapacita by se sice udržela na sto, ale byly by to samé
-- falešné rezervace.
--
-- Správně se odebírá od PUBLIC a pak se právo explicitně dá jen tomu, kdo ho
-- má mít: service roli, pod kterou běží serverové funkce.
-- ============================================================================

revoke all on function public.create_reservation(
  text, text, text, text, text, text, text, boolean, text, text, text, integer
) from public, anon, authenticated;

revoke all on function public.confirm_reservation(text) from public, anon, authenticated;

revoke all on function public.refresh_event_counter(uuid) from public, anon, authenticated;

grant execute on function public.create_reservation(
  text, text, text, text, text, text, text, boolean, text, text, text, integer
) to service_role;

grant execute on function public.confirm_reservation(text) to service_role;
grant execute on function public.refresh_event_counter(uuid) to service_role;

-- Zjišťování volných míst je naopak veřejné schválně, počet zbývajících
-- míst musí umět přečíst každý návštěvník. Nevrací nic osobního, jen
-- kapacitu a počet obsazených.
revoke all on function public.event_availability(text) from public;
grant execute on function public.event_availability(text) to anon, authenticated, service_role;

-- Aby stejná past nesklapla u funkcí, které teprve přibudou v dalších
-- fázích, přenastavíme výchozí práva pro nově vytvářené funkce.
alter default privileges in schema public revoke execute on functions from public;
