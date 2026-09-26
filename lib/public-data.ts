import 'server-only';
import { query } from './database';
import type { PublicHistory } from './public-history';

// A fixed public allowlist. Never expose the SQL connection to a browser.
export async function publicHistory(id: string): Promise<PublicHistory | null> {
  const rows = await query<{history: PublicHistory}>(`
    select json_build_object(
      'brand',v.brand,'model',v.model,'year',v.year,
      'plate',left(v.plate,3)||'****','mileage',v.mileage,
      'updated_at',v.updated_at,
      'services',coalesce((
        select json_agg(json_build_object(
          'date',s.service_date,'mileage',s.mileage,'type',s.type,
          'description',s.description,'parts',s.parts,
          'next_due_date',s.next_due_date,'next_due_mileage',s.next_due_mileage
        ) order by s.service_date desc)
        from services s where s.vehicle_id=v.id
      ),'[]'::json)
    ) as history from vehicles v where v.public_id=$1
  `,[id]);
  return rows[0]?.history ?? null;
}
