import { redirect } from 'next/navigation';
import { db } from './supabase';
export async function admin() {
  const client = await db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await client.from('profiles').select('id').eq('id', user.id).eq('role', 'admin').single();
  if (!profile) throw new Error('Acesso administrativo não autorizado. Configure o perfil conforme README.');
  return client;
}
