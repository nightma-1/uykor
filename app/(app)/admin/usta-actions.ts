'use server';

import { revalidatePublic } from '@/lib/i18n-server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';
import { readCallHours } from '@/lib/contact';
import { CATEGORIES } from '@/lib/masters';

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }
type SB = Awaited<ReturnType<typeof requireAdmin>>['sb'];

function refresh(id: string) {
  revalidatePublic('/ustalar');
  revalidatePublic(`/usta/${id}`);
}

// Identity documents are removed as soon as a decision is made.
async function purgeDocs(sb: SB, masterId: string) {
  const { data: docs } = await sb.from('master_docs').select('path').eq('master_id', masterId);
  if (docs && docs.length) {
    await sb.storage.from('hujjatlar').remove(docs.map((d) => d.path));
    await sb.from('master_docs').delete().eq('master_id', masterId);
  }
}

export async function adminSaveMaster(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const exp = str(f, 'experience_years');
  const status = str(f, 'status');
  const row = {
    name: str(f, 'name').slice(0, 80),
    phone: str(f, 'phone').slice(0, 20),
    categories: f.getAll('categories').map(String).filter((c) => CATEGORIES[c]),
    districts: str(f, 'districts').slice(0, 160),
    experience_years: exp === '' ? null : Math.max(0, Math.min(70, Math.round(Number(exp)) || 0)),
    price_note: str(f, 'price_note').slice(0, 80),
    description: str(f, 'description').slice(0, 3000),
    avatar_url: str(f, 'avatar_url') || null,
    status: ['qoralama', 'moderatsiya', 'faol', 'rad', 'arxiv'].includes(status) ? status : 'faol',
    verification: f.get('verified') === 'on' ? 'tasdiqlangan' : 'kutilmoqda',
    ...readCallHours(f),
  };
  const q = id ? sb.from('masters').update(row).eq('id', id).select('id').single() : sb.from('masters').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) redirect(`/admin/ustalar/${id || 'yangi'}?xato=${encodeURIComponent(error.message)}`);
  refresh(data!.id);
  redirect(`/admin/ustalar/${data!.id}?saqlandi=1`);
}

export async function approveMaster(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const { error } = await sb.from('masters').update({ status: 'faol', verification: 'tasdiqlangan', reject_reason: '' }).eq('id', id);
  if (error) redirect(`/admin/ustalar/${id}?xato=${encodeURIComponent(error.message)}`);
  await purgeDocs(sb, id);
  refresh(id);
  redirect('/admin/ustalar?tasdiqlandi=1');
}

export async function rejectMaster(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const reason = str(f, 'reason') || "Ma'lumotlar tasdiqlanmadi";
  await sb.from('masters').update({ status: 'rad', reject_reason: reason.slice(0, 300) }).eq('id', id);
  await purgeDocs(sb, id);
  refresh(id);
  redirect('/admin/ustalar?rad=1');
}

export async function setReviewStatus(f: FormData) {
  const { sb } = await requireAdmin();
  const status = str(f, 'status');
  const masterId = str(f, 'master_id');
  if (status === 'ochirish') await sb.from('master_reviews').delete().eq('id', str(f, 'id'));
  else if (['faol', 'rad'].includes(status)) await sb.from('master_reviews').update({ status }).eq('id', str(f, 'id'));
  refresh(masterId);
  redirect(str(f, 'back') === 'list' ? '/admin/ustalar' : `/admin/ustalar/${masterId}`);
}

export async function adminAddMasterPhoto(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'master_id');
  const url = str(f, 'url');
  if (url) {
    const { count } = await sb.from('master_photos').select('id', { count: 'exact', head: true }).eq('master_id', id);
    await sb.from('master_photos').insert({ master_id: id, url, sort: count ?? 0 });
    refresh(id);
  }
  redirect(`/admin/ustalar/${id}`);
}

export async function adminDeleteMasterPhoto(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'master_id');
  await sb.from('master_photos').delete().eq('id', str(f, 'id'));
  refresh(id);
  redirect(`/admin/ustalar/${id}`);
}

export async function blockMasterOwner(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const owner = str(f, 'owner_id');
  if (owner) await sb.from('profiles').update({ blocked: true }).eq('id', owner);
  await sb.from('masters').update({ status: 'rad', reject_reason: 'Hisob bloklandi' }).eq('id', id);
  await purgeDocs(sb, id);
  refresh(id);
  redirect('/admin/ustalar?bloklandi=1');
}

export async function adminDeleteMaster(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  await purgeDocs(sb, id);
  await sb.from('masters').delete().eq('id', id);
  refresh(id);
  redirect('/admin/ustalar');
}
