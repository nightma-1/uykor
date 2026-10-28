'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase-server';
import { readCallHours } from '@/lib/contact';

// Row-level security and the complexes/developers guard triggers decide what a developer may change;
// these actions only shape the input.

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }
function num(f: FormData, k: string) { const v = str(f, k).replace(/\s/g, '').replace(',', '.'); return v === '' ? null : Number(v); }
function date(f: FormData, k: string) { const v = str(f, k); return v === '' ? null : v; }

const BASE = '/kabinet/quruvchi';
const page = (cid: string, q = '') => `${BASE}/majmua/${cid}${q}`;
const refresh = () => revalidatePath('/[lang]', 'layout');
// Only images uploaded to our own storage.
const img = (u: string) => (u && u.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`) ? u : null);

function slugify(s: string) {
  const base = s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'majmua';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function submitClaim(f: FormData) {
  const { sb, user } = await requireUser(BASE);
  const company = str(f, 'company_name').slice(0, 100);
  if (company.length < 2) redirect(`${BASE}?xato=${encodeURIComponent('Kompaniya nomini yozing')}`);
  const devId = str(f, 'developer_id');
  const { error } = await sb.from('developer_claims').insert({
    user_id: user.id,
    developer_id: /^[0-9a-f-]{36}$/.test(devId) ? devId : null,
    company_name: company,
    contact_name: str(f, 'contact_name').slice(0, 80),
    position: str(f, 'position').slice(0, 80),
    phone: str(f, 'phone').slice(0, 20),
    note: str(f, 'note').slice(0, 1000),
    doc_path: str(f, 'doc_path') || null,
  });
  if (error) redirect(`${BASE}?xato=${encodeURIComponent(error.code === '23505' ? 'Arizangiz allaqachon tekshiruvda' : 'Ariza yuborilmadi')}`);
  redirect(`${BASE}?yuborildi=1`);
}

export async function saveCompany(f: FormData) {
  const { sb } = await requireUser(BASE);
  const { error } = await sb.from('developers').update({
    description: str(f, 'description').slice(0, 4000),
    description_ru: str(f, 'description_ru').slice(0, 4000),
    phone: str(f, 'phone').slice(0, 20) || null,
    ...readCallHours(f),
  }).eq('id', str(f, 'id'));
  refresh();
  redirect(`${BASE}?${error ? 'xato=' + encodeURIComponent('Saqlanmadi') : 'saqlandi=1'}`);
}

export async function setLeadStatus(f: FormData) {
  const { sb } = await requireUser(BASE);
  const status = ['yangi', 'boglanildi', 'yopildi'].includes(str(f, 'status')) ? str(f, 'status') : 'yangi';
  await sb.from('leads').update({ status }).eq('id', str(f, 'id'));
  revalidatePath(BASE);
}

export async function saveComplex(f: FormData) {
  const { sb } = await requireUser(BASE);
  const id = str(f, 'id');
  const name = str(f, 'name').slice(0, 120);
  const row: Record<string, unknown> = {
    name,
    city: str(f, 'city') || 'Samarqand',
    district: str(f, 'district'),
    address: str(f, 'address'),
    lat: num(f, 'lat'),
    lng: num(f, 'lng'),
    floors: num(f, 'floors'),
    blocks: num(f, 'blocks'),
    price_m2: num(f, 'price_m2'),
    area_min: num(f, 'area_min'),
    area_max: num(f, 'area_max'),
    installment_months: num(f, 'installment_months') ?? 0,
    first_payment_pct: num(f, 'first_payment_pct') ?? 30,
    status: str(f, 'status') === 'topshirilgan' ? 'topshirilgan' : 'qurilmoqda',
    promised_date: date(f, 'promised_date'),
    progress: Math.max(0, Math.min(100, num(f, 'progress') ?? 0)),
    description: str(f, 'description'),
    description_ru: str(f, 'description_ru'),
    cover_url: img(str(f, 'cover_url')),
  };
  let res;
  if (id) {
    res = await sb.from('complexes').update(row).eq('id', id).select('id').single();
  } else {
    res = await sb.from('complexes').insert({ ...row, developer_id: str(f, 'developer_id'), slug: slugify(name), kadastr_status: 'jarayonda' }).select('id').single();
  }
  if (res.error || !res.data) redirect(`${id ? page(id) : `${BASE}/majmua/yangi`}?xato=${encodeURIComponent(res.error?.message || 'Saqlanmadi')}`);
  refresh();
  redirect(page(res.data.id, '?saqlandi=1'));
}

export async function addUnit(f: FormData) {
  const { sb } = await requireUser(BASE);
  const cid = str(f, 'complex_id');
  await sb.from('unit_types').insert({ complex_id: cid, rooms: num(f, 'rooms'), area: num(f, 'area'), price: num(f, 'price'), available: num(f, 'available') });
  refresh();
  redirect(page(cid));
}

export async function deleteUnit(f: FormData) {
  const { sb } = await requireUser(BASE);
  await sb.from('unit_types').delete().eq('id', str(f, 'id'));
  refresh();
  redirect(page(str(f, 'complex_id')));
}

export async function addProgress(f: FormData) {
  const { sb } = await requireUser(BASE);
  const cid = str(f, 'complex_id');
  const month = str(f, 'month');
  await sb.from('progress_updates').insert({ complex_id: cid, month: month.length === 7 ? `${month}-01` : month, title: str(f, 'title'), title_ru: str(f, 'title_ru'), photo_url: img(str(f, 'photo_url')) });
  refresh();
  redirect(page(cid));
}

export async function deleteProgress(f: FormData) {
  const { sb } = await requireUser(BASE);
  await sb.from('progress_updates').delete().eq('id', str(f, 'id'));
  refresh();
  redirect(page(str(f, 'complex_id')));
}

export async function addNearby(f: FormData) {
  const { sb } = await requireUser(BASE);
  const cid = str(f, 'complex_id');
  await sb.from('nearby').insert({ complex_id: cid, kind: str(f, 'kind'), distance_m: num(f, 'distance_m') });
  refresh();
  redirect(page(cid));
}

export async function deleteNearby(f: FormData) {
  const { sb } = await requireUser(BASE);
  await sb.from('nearby').delete().eq('id', str(f, 'id'));
  refresh();
  redirect(page(str(f, 'complex_id')));
}

export async function addPhoto(f: FormData) {
  const { sb } = await requireUser(BASE);
  const cid = str(f, 'complex_id');
  const url = img(str(f, 'url'));
  if (url) {
    const { count } = await sb.from('complex_photos').select('id', { count: 'exact', head: true }).eq('complex_id', cid);
    if ((count ?? 0) < 30) await sb.from('complex_photos').insert({ complex_id: cid, url, caption: str(f, 'caption'), sort: count ?? 0 });
    refresh();
  }
  redirect(page(cid));
}

export async function deletePhoto(f: FormData) {
  const { sb } = await requireUser(BASE);
  await sb.from('complex_photos').delete().eq('id', str(f, 'id'));
  refresh();
  redirect(page(str(f, 'complex_id')));
}
