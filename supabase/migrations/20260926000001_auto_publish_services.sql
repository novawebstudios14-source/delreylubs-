-- Restore automatic publication of service history. Internal notes are never returned.
create or replace function public.vehicle_public_history(p_public_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'brand', v.brand,
    'model', v.model,
    'year', v.year,
    'plate', left(v.plate, 3) || '****',
    'mileage', v.mileage,
    'updated_at', v.updated_at,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', s.service_date,
        'mileage', s.mileage,
        'type', s.type,
        'description', s.description,
        'parts', s.parts,
        'next_due_date', s.next_due_date,
        'next_due_mileage', s.next_due_mileage
      ) order by s.service_date desc)
      from public.services s
      where s.vehicle_id = v.id
    ), '[]'::jsonb)
  )
  from public.vehicles v
  where v.public_id = p_public_id
$$;

alter table public.services drop column is_public;
