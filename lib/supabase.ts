import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';
type CookieItem = {name:string;value:string;options?:CookieOptions};

export async function db() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return jar.getAll(); },
      setAll(items: CookieItem[]) { try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server Component: middleware refreshes cookies */ } },
    },
  });
}
