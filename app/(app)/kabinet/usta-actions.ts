'use server';

import { revalidatePublic } from '@/lib/i18n-server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase-server';
import { CATEGORIES } from '@/lib/masters';
import { readCallHours } from '@/lib/contact';

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }
function back(q = ''): never { redirect(`/kabinet/usta${q}`); }
const err = (m: string) => `?xato=${encodeURIComponent(m)}`;

async function myMaster() {
  const ctx = await requireUser('/kabinet/usta');
  const { data } = await ctx.sb.from('masters').select('id, status, verification').eq('owner_id', ctx.user.id).maybeSingle();
  return { ...ctx, master: data as { id: string; status: string; verification: string } | null };
}

function refresh(id: string) {
  revalidatePublic('/ustalar');
  revalidatePublic(`/usta/${id}`);
}

export async function saveMaster(f: FormData) {
  const { sb, user, master } = await myMaster();
  const cats = f.getAll('categories').map(String).filter((c) => CATEGORIES[c]);
  const exp = str(f, 'experience_years');
  const row = {
    name: str(f, 'name').slice(0, 80),
    phone: str(f, 'phone').slice(0, 20),
    categories: cats,
    districts: str(f, 'districts').slice(0, 160),
    experience_years: exp === '' ? null : Math.max(0, Math.min(70, Math.round(Number(exp)) || 0)),
    price_note: str(f, 'price_note').slice(0, 80),
    description: str(f, 'description').slice(0, 3000),
    avatar_url: str(f, 'avatar_url') || null,
    ...readCallHours(f),
  };
  if (row.name.length < 2) back(err('Ismingizni yozing'));
  if (!cats.length) back(err("Kamida bitta yo'nalish tanlang"));
  if (master) {
    if (master.status === 'moderatsiya') back(err("Profil tekshiruvda, hozir o'zgartirib bo'lmaydi"));
    const { error } = await sb.from('masters').update(row).eq('id', master.id);
    if (error) back(err(error.message));
    refresh(master.id);
    back('?saqlandi=1');
  }
  const { error } = await sb.from('masters').insert({ ...row, owner_id: user.id, status: 'qoralama' });
  if (error) back(err(error.message));
  back('?yangi=1');
}

export async function addMasterPhoto(f: FormData) {
  const { sb, master } = await myMaster();
  const url = str(f, 'url');
  if (!master || !url) back();
  const { count } = await sb.from('master_photos').select('id', { count: 'exact', head: true }).eq('master_id', master.id);
  if ((count ?? 0) >= 20) back(err("Eng ko'pi 20 ta rasm"));
  await sb.from('master_photos').insert({ master_id: master.id, url, sort: count ?? 0 });
  refresh(master.id);
  back();
}

export async function deleteMasterPhoto(f: FormData) {
  const { sb, user, master } = await myMaster();
  if (!master) back();
  const url = str(f, 'url');
  await sb.from('master_photos').delete().eq('id', str(f, 'id')).eq('master_id', master.id);
  const marker = '/elonlar/';
  const i = url.indexOf(marker);
  if (i >= 0) {
    const path = url.slice(i + marker.length);
    if (path.startsWith(`${user.id}/`)) await sb.storage.from('elonlar').remove([path]);
  }
  refresh(master.id);
  back();
}

export async function addMasterDoc(f: FormData) {
  const { sb, user, master } = await myMaster();
  const path = str(f, 'path');
  if (master && path.startsWith(`${user.id}/`)) await sb.from('master_docs').insert({ master_id: master.id, kind: 'pasport', path });
  back();
}

export async function deleteMasterDoc(f: FormData) {
  const { sb, user, master } = await myMaster();
  if (!master) back();
  const { data: doc } = await sb.from('master_docs').select('path').eq('id', str(f, 'id')).eq('master_id', master.id).maybeSingle();
  if (doc) {
    if (doc.path.startsWith(`${user.id}/`)) await sb.storage.from('hujjatlar').remove([doc.path]);
    await sb.from('master_docs').delete().eq('id', str(f, 'id'));
  }
  back();
}

export async function submitMaster() {
  const { sb, master } = await myMaster();
  if (!master) back();
  const [{ data: m }, { count: docs }, { data: phone }] = await Promise.all([
    sb.from('masters').select('categories').eq('id', master.id).single(),
    sb.from('master_docs').select('id', { count: 'exact', head: true }).eq('master_id', master.id),
    sb.rpc('my_contact', { kind: 'usta', rid: master.id }),
  ]);
  const missing: string[] = [];
  if (!phone) missing.push('telefon raqam');
  if (!m?.categories?.length) missing.push("yo'nalish");
  if (master.verification !== 'tasdiqlangan' && !docs) missing.push('pasport rasmi');
  if (missing.length) back(err('Yetishmayapti: ' + missing.join(', ')));
  const { error } = await sb.from('masters').update({ status: 'moderatsiya' }).eq('id', master.id);
  if (error) back(err(error.message));
  back('?yuborildi=1');
}

export async function setMasterStatus(f: FormData) {
  const { sb, master } = await myMaster();
  if (!master) back();
  const status = str(f, 'status');
  if (!['arxiv', 'faol'].includes(status)) back();
  const { error } = await sb.from('masters').update({ status }).eq('id', master.id);
  refresh(master.id);
  if (error) back(err(error.message));
  back('?saqlandi=1');
}

export async function deleteMaster() {
  const { sb, user, master } = await myMaster();
  if (!master) back();
  const [{ data: photos }, { data: docs }, { data: m }] = await Promise.all([
    sb.from('master_photos').select('url').eq('master_id', master.id),
    sb.from('master_docs').select('path').eq('master_id', master.id),
    sb.from('masters').select('avatar_url').eq('id', master.id).single(),
  ]);
  const marker = '/elonlar/';
  const urls = [...(photos || []).map((p) => p.url), m?.avatar_url || ''];
  const paths = urls.filter((u) => u.includes(marker)).map((u) => u.slice(u.indexOf(marker) + marker.length)).filter((p) => p.startsWith(`${user.id}/`));
  if (paths.length) await sb.storage.from('elonlar').remove(paths);
  const docPaths = (docs || []).map((d) => d.path).filter((p) => p.startsWith(`${user.id}/`));
  if (docPaths.length) await sb.storage.from('hujjatlar').remove(docPaths);
  await sb.from('masters').delete().eq('id', master.id);
  refresh(master.id);
  redirect('/kabinet?ochirildi=1');
}
