'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { admin } from '@/lib/auth';
import { phoneDigits } from '@/lib/phone';
import { query, transaction } from '@/lib/database';
import { accountForSession, adminAccount, sessionCookie } from '@/lib/appwrite';
import { cookies } from 'next/headers';

function required(f: FormData, name: string) { const v = String(f.get(name) ?? '').trim(); if (!v) throw new Error(`Campo obrigatório: ${name}`); return v; }
function optional(f: FormData, name: string) { return String(f.get(name) ?? '').trim() || null; }
function number(f: FormData, name: string) { const v = optional(f,name); if (v === null) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`Número inválido: ${name}`); return n; }
function bounded(f: FormData, name: string, max: number) {
  const value = optional(f, name);
  if (value && value.length > max) throw new Error(`Campo ${name} excede ${max} caracteres`);
  return value;
}
export async function login(f: FormData) {
  const identifier=required(f,'identifier').toLowerCase();
  const email=identifier==='nicolasdelrey'?'nicolasdelrey@delreylubs.example':identifier;
  const password=required(f,'password');
  let secret: string | null = null; let expires: string | null = null;
  try {
    const session = await adminAccount().createEmailPasswordSession({email, password});
    const account = await accountForSession(session.secret).get();
    const profile = await query('select id from profiles where id=$1 and role=$2', [account.$id, 'admin']);
    if (!profile.length) {
      await accountForSession(session.secret).deleteSession({sessionId: 'current'});
      throw new Error('Conta sem acesso administrativo.');
    }
    secret = session.secret; expires = session.expire;
  } catch { redirect('/login?erro=credenciais'); }
  if (!secret || !expires) redirect('/login?erro=credenciais');
  (await cookies()).set(sessionCookie, secret, {httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', expires:new Date(expires)});
  redirect('/');
}
export async function logout() {
  const jar=await cookies(); const secret=jar.get(sessionCookie)?.value;
  if (secret) { try { await accountForSession(secret).deleteSession({sessionId:'current'}); } catch { /* Expired session */ } }
  jar.delete(sessionCookie); redirect('/login');
}
export async function saveCustomer(f: FormData) {
  await admin(); const id=optional(f,'id');
  const fields={name:required(f,'name'),phone:phoneDigits(required(f,'phone')),whatsapp:optional(f,'whatsapp') ? phoneDigits(optional(f,'whatsapp')!) : null,email:optional(f,'email'),cpf:optional(f,'cpf'),notes:optional(f,'notes')};
  const values=[fields.name,fields.phone,fields.whatsapp,fields.email,fields.cpf,fields.notes];
  if (id) {
    const rows=await query('update customers set name=$1,phone=$2,whatsapp=$3,email=$4,cpf=$5,notes=$6 where id=$7 returning id',[...values,id]);
    if (!rows.length) throw new Error('Cliente não encontrado.');
  } else await query('insert into customers(name,phone,whatsapp,email,cpf,notes) values($1,$2,$3,$4,$5,$6)', values);
  revalidatePath('/clientes'); redirect('/clientes');
}
export async function saveVehicle(f: FormData) {
  await admin(); const id=optional(f,'id'); const owner=required(f,'customer_id');
  const fields={customer_id:owner,plate:required(f,'plate').toUpperCase().replace(/[^A-Z0-9]/g,''),brand:required(f,'brand'),model:required(f,'model'),version:optional(f,'version'),year:number(f,'year'),color:optional(f,'color'),fuel:optional(f,'fuel'),mileage:number(f,'mileage')??0,chassis:optional(f,'chassis')};
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(fields.plate)) throw new Error('Placa inválida');
  if (!fields.year || fields.year < 1900 || fields.year > 2100) throw new Error('Ano inválido');
  const values=[fields.customer_id,fields.plate,fields.brand,fields.model,fields.version,fields.year,fields.color,fields.fuel,fields.mileage,fields.chassis];
  const rows=id
    ? await query('update vehicles set customer_id=$1,plate=$2,brand=$3,model=$4,version=$5,year=$6,color=$7,fuel=$8,mileage=$9,chassis=$10 where id=$11 returning id',[...values,id])
    : await query('insert into vehicles(customer_id,plate,brand,model,version,year,color,fuel,mileage,chassis) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id',values);
  if (!rows.length) throw new Error('Veículo não encontrado.');
  revalidatePath('/veiculos'); redirect(`/veiculos?id=${rows[0].id}`);
}
export async function saveService(f:FormData) {
  await admin(); const id=optional(f,'id'); const vehicle=required(f,'vehicle_id');
  const serviceType=required(f,'type'); const description=required(f,'description');
  if (serviceType.length > 120 || description.length > 2000) throw new Error('Texto público excede o limite permitido');
  const fields={vehicle_id:vehicle,service_date:required(f,'service_date'),mileage:number(f,'mileage'),type:serviceType,description,parts:bounded(f,'parts',500),amount:number(f,'amount'),mechanic:optional(f,'mechanic'),private_notes:optional(f,'private_notes'),next_due_date:optional(f,'next_due_date'),next_due_mileage:number(f,'next_due_mileage')};
  const values=[fields.vehicle_id,fields.service_date,fields.mileage,fields.type,fields.description,fields.parts,fields.amount,fields.mechanic,fields.private_notes,fields.next_due_date,fields.next_due_mileage];
  const rows=id
    ? await query('update services set vehicle_id=$1,service_date=$2,mileage=$3,type=$4,description=$5,parts=$6,amount=$7,mechanic=$8,private_notes=$9,next_due_date=$10,next_due_mileage=$11 where id=$12 returning id',[...values,id])
    : await query('insert into services(vehicle_id,service_date,mileage,type,description,parts,amount,mechanic,private_notes,next_due_date,next_due_mileage) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id',values);
  if (!rows.length) throw new Error('Serviço não encontrado.');
  revalidatePath('/servicos'); revalidatePath('/retornos'); revalidatePath(`/veiculos?id=${vehicle}`); redirect(`/veiculos?id=${vehicle}`);
}
export async function rotatePublicLink(f: FormData) {
  await admin(); const vehicle=required(f,'vehicle_id');
  const rows=await query('update vehicles set public_id=$1 where id=$2 returning id',[crypto.randomUUID(),vehicle]);
  if (!rows.length) throw new Error('Veículo não encontrado.');
  revalidatePath('/veiculos'); redirect(`/veiculos?id=${vehicle}`);
}
export async function transfer(f:FormData) {
  await admin(); const vehicle=required(f,'vehicle_id'); const customer=required(f,'customer_id');
  await transaction(async client => {
    const owners=await client.query('select customer_id from vehicles where id=$1 for update',[vehicle]);
    if (!owners.rows.length) throw new Error('Veículo não encontrado.');
    if (owners.rows[0].customer_id===customer) throw new Error('Proprietário já vinculado.');
    const customers=await client.query('select id from customers where id=$1',[customer]);
    if (!customers.rows.length) throw new Error('Cliente não encontrado.');
    await client.query('update vehicle_ownership_history set end_date=now() where vehicle_id=$1 and end_date is null',[vehicle]);
    await client.query('update vehicles set customer_id=$1 where id=$2',[customer,vehicle]);
    await client.query('insert into vehicle_ownership_history(vehicle_id,customer_id) values($1,$2)',[vehicle,customer]);
  });
  revalidatePath('/veiculos'); redirect(`/veiculos?id=${vehicle}`);
}
export async function contacted(f:FormData) {
  await admin(); const vehicle=required(f,'vehicle_id');
  await query('insert into contact_logs(vehicle_id,notes) values($1,$2)',[vehicle,optional(f,'notes')]);
  revalidatePath('/retornos'); revalidatePath('/'); redirect(optional(f,'redirect_to')==='/'?'/':'/retornos');
}
