import 'server-only';
import { Account, Client } from 'node-appwrite';
import { cookies } from 'next/headers';

export const sessionCookie = 'workshop_session';

function client() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  if (!endpoint || !project) throw new Error('Configuração de autenticação Appwrite ausente.');
  return new Client().setEndpoint(endpoint).setProject(project);
}

export function adminAccount() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error('APPWRITE_API_KEY ausente.');
  return new Account(client().setKey(key));
}

export function accountForSession(secret: string) {
  return new Account(client().setSession(secret));
}

export async function currentAccount() {
  const secret = (await cookies()).get(sessionCookie)?.value;
  if (!secret) return null;
  try { return await accountForSession(secret).get(); }
  catch { return null; }
}
