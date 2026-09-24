create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, role text not null default 'admin' check(role='admin'), created_at timestamptz not null default now());
create table public.customers (id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), phone text not null, whatsapp text, email text, cpf text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.vehicles (id uuid primary key default gen_random_uuid(), public_id uuid not null unique default gen_random_uuid(), customer_id uuid not null references public.customers(id), plate text not null unique check(plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'), brand text not null, model text not null, version text, year integer check(year between 1900 and 2100), color text, fuel text, mileage integer not null default 0 check(mileage >= 0), chassis text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.vehicle_ownership_history (id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id), customer_id uuid not null references public.customers(id), start_date timestamptz not null default now(), end_date timestamptz, check(end_date is null or end_date >= start_date));
create unique index one_current_owner on public.vehicle_ownership_history(vehicle_id) where end_date is null;
create table public.services (id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id), service_date date not null, mileage integer check(mileage >= 0), type text not null, description text not null, parts text, amount numeric(12,2) check(amount >= 0), mechanic text, private_notes text, next_due_date date, next_due_mileage integer check(next_due_mileage >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.maintenance_reminders (id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id), service_id uuid not null unique references public.services(id), due_date date, due_mileage integer, type text not null, created_at timestamptz not null default now(), check(due_date is not null or due_mileage is not null));
create table public.contact_logs (id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id), notes text, contacted_at timestamptz not null default now());
create index vehicles_customer_idx on public.vehicles(customer_id);
create index services_vehicle_date_idx on public.services(vehicle_id,service_date desc);
create index reminders_due_idx on public.maintenance_reminders(due_date);
create index contacts_vehicle_date_idx on public.contact_logs(vehicle_id,contacted_at desc);
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end $$;
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
create trigger vehicles_touch before update on public.vehicles for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();
create function public.record_ownership() returns trigger language plpgsql set search_path = '' as $$ begin insert into public.vehicle_ownership_history(vehicle_id,customer_id) values(new.id,new.customer_id); return new; end $$;
create trigger vehicle_initial_owner after insert on public.vehicles for each row execute function public.record_ownership();
create function public.sync_reminder() returns trigger language plpgsql set search_path = '' as $$ begin
 delete from public.maintenance_reminders where service_id=new.id;
 if new.next_due_date is not null or new.next_due_mileage is not null then
 insert into public.maintenance_reminders(vehicle_id,service_id,due_date,due_mileage,type) values(new.vehicle_id,new.id,new.next_due_date,new.next_due_mileage,new.type);
 end if;
 return new; end $$;
create trigger service_reminder after insert or update on public.services for each row execute function public.sync_reminder();
create function public.sync_vehicle_mileage() returns trigger language plpgsql set search_path = '' as $$ begin
 if new.mileage is not null then update public.vehicles set mileage=greatest(mileage,new.mileage) where id=new.vehicle_id; end if;
 return new; end $$;
create trigger service_mileage after insert or update of mileage,vehicle_id on public.services for each row execute function public.sync_vehicle_mileage();
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
-- Tables are exclusively administrative. The public lookup runs through a narrow RPC below.
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_ownership_history enable row level security;
alter table public.services enable row level security;
alter table public.maintenance_reminders enable row level security;
alter table public.contact_logs enable row level security;
create policy admin_all on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_all on public.customers for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_all on public.vehicles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_all on public.vehicle_ownership_history for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_all on public.services for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_all on public.maintenance_reminders for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_all on public.contact_logs for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- This function is intentionally callable anonymously. It only selects an explicit public field allowlist.
create function public.vehicle_public_history(p_public_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('brand',v.brand,'model',v.model,'year',v.year,'plate',left(v.plate,3)||'****','mileage',v.mileage,'updated_at',v.updated_at,
 'services',coalesce((select jsonb_agg(jsonb_build_object('date',s.service_date,'mileage',s.mileage,'type',s.type,'description',s.description,'parts',s.parts,'next_due_date',s.next_due_date,'next_due_mileage',s.next_due_mileage) order by s.service_date desc) from public.services s where s.vehicle_id=v.id),'[]'::jsonb))
 from public.vehicles v where v.public_id=p_public_id
 $$;
revoke all on function public.vehicle_public_history(uuid) from public;
grant execute on function public.vehicle_public_history(uuid) to anon, authenticated;
create function public.transfer_vehicle(p_vehicle uuid,p_customer uuid) returns void language plpgsql security definer set search_path = '' as $$ begin
 if not public.is_admin() then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.customers where id=p_customer) then raise exception 'Customer not found'; end if;
 perform 1 from public.vehicles where id=p_vehicle for update;
 if not found then raise exception 'Vehicle not found'; end if;
 if (select customer_id from public.vehicles where id=p_vehicle)=p_customer then raise exception 'Owner unchanged'; end if;
 update public.vehicle_ownership_history set end_date=now() where vehicle_id=p_vehicle and end_date is null;
 update public.vehicles set customer_id=p_customer where id=p_vehicle;
 insert into public.vehicle_ownership_history(vehicle_id,customer_id) values(p_vehicle,p_customer);
 end $$;
revoke all on function public.transfer_vehicle(uuid,uuid) from public;
grant execute on function public.transfer_vehicle(uuid,uuid) to authenticated;
grant usage on schema public to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.customers,public.vehicles,public.vehicle_ownership_history,public.services,public.maintenance_reminders,public.contact_logs to authenticated;
