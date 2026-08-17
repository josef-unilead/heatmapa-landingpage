-- ============================================================================
-- Rozlišit, které pole při registraci koliduje.
--
-- Dosud se vracelo jen "duplicate" a aplikace na to odpovídala stejnou větou
-- jako na úspěch, aby přes formulář nešlo zjišťovat, kdo je zaregistrovaný.
-- V praxi to ale mátlo i pořadatele: člověk zadá číslo, které už použil,
-- uvidí "Zkontroluj si e-mail" a žádný nedostane.
--
-- Nově se pozná, jestli kolidoval e-mail nebo telefon, ať aplikace může
-- říct konkrétně, co je špatně. Je to vědomý ústupek: kdo zná cizí e-mail,
-- zjistí z formuláře, že je registrovaný. Rychlost takového zkoušení drží
-- limit pokusů na IP.
--
-- Název porušeného indexu se čte z diagnostiky výjimky, ne z textu chybové
-- hlášky. Text se mezi verzemi Postgresu mění, název omezení ne.
-- ============================================================================

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
  v_constraint text;
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
    get stacked diagnostics v_constraint = constraint_name;
    return jsonb_build_object(
      'ok', false,
      'reason', case
        when v_constraint = 'reservations_event_phone_active' then 'duplicate_phone'
        when v_constraint = 'reservations_event_email_active' then 'duplicate_email'
        else 'duplicate'
      end);
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

revoke all on function public.create_reservation(
  text, text, text, text, text, text, text, boolean, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.create_reservation(
  text, text, text, text, text, text, text, boolean, text, text, text, integer
) to service_role;
