// Deletes the signed-in user's Uykor account and everything tied to it.
// Required by the App Store (5.1.1(v)) and Google Play account-deletion rules.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function removeFolder(bucket: string, prefix: string) {
  // Storage has no recursive delete: list each level and remove files.
  const stack = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    if (!data?.length) continue;
    const files = data.filter((f) => f.id).map((f) => `${dir}/${f.name}`);
    data.filter((f) => !f.id).forEach((f) => stack.push(`${dir}/${f.name}`));
    if (files.length) await admin.storage.from(bucket).remove(files);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await admin.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return json({ ok: false, error: 'auth' }, 401);
  const uid = user.id;

  try {
    // Master profiles are kept on account deletion by the FK (set null), so remove them explicitly.
    await admin.from('masters').delete().eq('owner_id', uid);
    await removeFolder('elonlar', uid);
    await removeFolder('hujjatlar', uid);
    // Everything else (profile, listings, favorites, alerts, reviews, Telegram link, developer membership) cascades.
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'failed' }, 500);
  }
});
