import 'server-only';
import { query } from './database';

export async function reminders() {
  return query(`
    select r.id,r.vehicle_id,r.type,r.due_date::text,r.due_mileage,
      json_build_object('service_date',s.service_date,'updated_at',s.updated_at) as services,
      json_build_object('id',v.id,'plate',v.plate,'brand',v.brand,
        'model',v.model,'mileage',v.mileage,'customer_id',v.customer_id,
        'customers',json_build_object('name',c.name,'phone',c.phone,'whatsapp',c.whatsapp)) as vehicles
    from maintenance_reminders r
    join services s on s.id=r.service_id
    join vehicles v on v.id=r.vehicle_id
    join customers c on c.id=v.customer_id
    order by r.due_date asc nulls last,r.id asc
  `);
}
