'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { admin } from '@/lib/auth';

function required(f: FormData, name: string) { const v = String(f.get(name) ?? '').trim(); if (!v) throw new Error(`Campo obrigatório: ${name}`); return v; }
function optional(f: FormData, name: string) { return String(f.get(name) ?? '').trim() || null; }
function number(f: FormData, name: string) { const v = optional(f,name); if (v === null) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`Número inválido: ${name}`); return n; }
function result(error: {message:string}|null) { if (error) throw new Error(error.message); }
export async function login(f: FormData) {
  const s = await db(); const identifier=required(f,'identifier').toLowerCase(); const email=identifier==='nicolasdelrey'?'nicolasdelrey@delreylubs.example':identifier; const { error } = await s.auth.signInWithPassword({email, password:required(f,'password')});
  if (error) redirect('/login?erro=credenciais');
  redirect('/');
}
export async function logout() { const s = await db(); await s.auth.signOut(); redirect('/login'); }
export async function saveCustomer(f: FormData) {
  const s = await admin(); const id=optional(f,'id');
  const fields={name:required(f,'name'),phone:required(f,'phone'),whatsapp:optional(f,'whatsapp'),email:optional(f,'email'),cpf:optional(f,'cpf'),notes:optional(f,'notes')};
  const q=id?s.from('customers').update(fields).eq('id',id):s.from('customers').insert(fields);
  const {error}=await q; result(error); revalidatePath('/clientes'); redirect('/clientes');
}
export async function saveVehicle(f: FormData) {
  const s=await admin(); const id=optional(f,'id'); const owner=required(f,'customer_id');
  const fields={customer_id:owner,plate:required(f,'plate').toUpperCase().replace(/[^A-Z0-9]/g,''),brand:required(f,'brand'),model:required(f,'model'),version:optional(f,'version'),year:number(f,'year'),color:optional(f,'color'),fuel:optional(f,'fuel'),mileage:number(f,'mileage')??0,chassis:optional(f,'chassis')};
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(fields.plate)) throw new Error('Placa inválida');
  if (!fields.year || fields.year < 1900 || fields.year > 2100) throw new Error('Ano inválido');
  const q=id?s.from('vehicles').update(fields).eq('id',id).select('id').single():s.from('vehicles').insert(fields).select('id').single();
  const {data,error}=await q; result(error); revalidatePath('/veiculos'); redirect(`/veiculos?id=${data!.id}`);
}
export async function saveService(f:FormData) {
  const s=await admin(); const id=optional(f,'id'); const vehicle=required(f,'vehicle_id');
  const fields={vehicle_id:vehicle,service_date:required(f,'service_date'),mileage:number(f,'mileage'),type:required(f,'type'),description:required(f,'description'),parts:optional(f,'parts'),amount:number(f,'amount'),mechanic:optional(f,'mechanic'),private_notes:optional(f,'private_notes'),next_due_date:optional(f,'next_due_date'),next_due_mileage:number(f,'next_due_mileage')};
  const q=id?s.from('services').update(fields).eq('id',id):s.from('services').insert(fields);
  const {error}=await q; result(error); revalidatePath('/servicos'); revalidatePath('/retornos'); revalidatePath(`/veiculos?id=${vehicle}`); redirect(`/veiculos?id=${vehicle}`);
}
export async function transfer(f:FormData) {
  const s=await admin(); const vehicle=required(f,'vehicle_id'); const customer=required(f,'customer_id');
  const {error}=await s.rpc('transfer_vehicle',{p_vehicle:vehicle,p_customer:customer}); result(error);
  revalidatePath('/veiculos'); redirect(`/veiculos?id=${vehicle}`);
}
export async function contacted(f:FormData) {
  const s=await admin(); const vehicle=required(f,'vehicle_id');
  const {error}=await s.from('contact_logs').insert({vehicle_id:vehicle,notes:optional(f,'notes')}); result(error);
  revalidatePath('/retornos'); redirect('/retornos');
}
