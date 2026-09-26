-- Appwrite native PostgreSQL schema; run only on an empty destination.
-- The database connection is server-only. Preserve row UUIDs and public_id during import.
BEGIN;
create table public.profiles (id uuid primary key, role text not null default 'admin' check(role='admin'), created_at timestamptz not null default now());
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
COMMIT;
