-- Supabase may assign explicit EXECUTE to anon through default privileges.
-- The public vehicle history RPC remains available to anon by design.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.transfer_vehicle(uuid,uuid) from anon;
