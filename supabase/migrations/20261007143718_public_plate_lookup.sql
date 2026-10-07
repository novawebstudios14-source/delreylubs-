-- Resolve an exact plate to the existing public history without exposing customer data.
create or replace function public.vehicle_public_id_by_plate(p_plate text)
returns uuid language sql stable security definer set search_path = '' as $$
  select v.public_id
  from public.vehicles v
  where upper(regexp_replace(p_plate, '[^a-zA-Z0-9]', '', 'g')) ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'
    and upper(regexp_replace(v.plate, '[^a-zA-Z0-9]', '', 'g')) = upper(regexp_replace(p_plate, '[^a-zA-Z0-9]', '', 'g'))
  limit 1
$$;
revoke all on function public.vehicle_public_id_by_plate(text) from public;
grant execute on function public.vehicle_public_id_by_plate(text) to anon, authenticated;
