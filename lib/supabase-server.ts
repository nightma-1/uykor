import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

// Session-aware client for the admin area.
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component; middleware refreshes the session.
        }
      },
    },
  });
}

export async function requireUser(next = '/kabinet') {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/kirish?keyin=${encodeURIComponent(next)}`);
  return { sb, user };
}

export async function requireAdmin() {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!data) redirect('/admin/login?xato=ruxsat');
  return { sb, user };
}
