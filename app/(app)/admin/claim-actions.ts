'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';
import { slugify } from './actions';

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }
const LIST = '/admin/quruvchilar';

type SB = Awaited<ReturnType<typeof requireAdmin>>['sb'];

// The company document is removed as soon as a decision is made.
async function purgeDoc(sb: SB, path: string | null) {
  if (path) await sb.storage.from('hujjatlar').remove([path]);
}

export async function approveClaim(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const { data: claim } = await sb.from('developer_claims').select('*').eq('id', id).maybeSingle();
  if (!claim || claim.status !== 'kutilmoqda') redirect(LIST);

  let devId = str(f, 'developer_id');
  if (devId === 'yangi') {
    const name = str(f, 'new_name') || claim.company_name;
    const { data: dev, error } = await sb.from('developers').insert({
      name,
      slug: `${await slugify(name)}-${Math.random().toString(36).slice(2, 5)}`,
      initials: name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
      city: 'Samarqand',
      phone: claim.phone || null,
    }).select('id').single();
    if (error || !dev) redirect(`${LIST}?xato=${encodeURIComponent(error?.message || 'Quruvchi yaratilmadi')}`);
    devId = dev.id;
  }
  if (!/^[0-9a-f-]{36}$/.test(devId)) redirect(`${LIST}?xato=${encodeURIComponent('Quruvchini tanlang')}`);

  const { error: mErr } = await sb.from('developer_members').upsert({ developer_id: devId, user_id: claim.user_id }, { onConflict: 'developer_id,user_id', ignoreDuplicates: true });
  if (mErr) redirect(`${LIST}?xato=${encodeURIComponent(mErr.message)}`);
  await sb.from('profiles').update({ account_type: 'quruvchi', company: claim.company_name.slice(0, 100) }).eq('id', claim.user_id);
  await sb.from('developer_claims').update({ status: 'tasdiqlangan', developer_id: devId, doc_path: null, decided_at: new Date().toISOString() }).eq('id', id);
  await purgeDoc(sb, claim.doc_path);
  revalidatePath('/[lang]', 'layout');
  redirect(`${LIST}?ulandi=1`);
}

export async function rejectClaim(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const { data: claim } = await sb.from('developer_claims').select('doc_path').eq('id', id).maybeSingle();
  await sb.from('developer_claims').update({ status: 'rad', reject_reason: str(f, 'reason').slice(0, 300), doc_path: null, decided_at: new Date().toISOString() }).eq('id', id);
  await purgeDoc(sb, claim?.doc_path ?? null);
  redirect(`${LIST}?rad=1`);
}

export async function removeMember(f: FormData) {
  const { sb } = await requireAdmin();
  const dev = str(f, 'developer_id');
  await sb.from('developer_members').delete().eq('developer_id', dev).eq('user_id', str(f, 'user_id'));
  redirect(`${LIST}/${dev}?saqlandi=1`);
}
