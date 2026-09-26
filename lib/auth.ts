import { redirect } from 'next/navigation';
import { currentAccount } from './appwrite';
import { query } from './database';
export async function admin() {
  const user = await currentAccount();
  if (!user) redirect('/login');
  const rows = await query('select id from profiles where id = $1 and role = $2', [user.$id, 'admin']);
  if (!rows.length) throw new Error('Acesso administrativo não autorizado. Configure o perfil conforme README.');
  return user;
}
