'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin, sessionClient } from '@/lib/supabase-server';
import { readCallHours } from '@/lib/contact';

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }
function num(f: FormData, k: string) { const v = str(f, k).replace(/\s/g, '').replace(',', '.'); return v === '' ? null : Number(v); }
function bool(f: FormData, k: string) { return f.get(k) === 'on'; }
function date(f: FormData, k: string) { const v = str(f, k); return v === '' ? null : v; }

export async function slugify(s: string) {
  return s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'majmua';
}

function refreshPublic() {
  revalidatePath('/[lang]', 'layout');
}

export async function signOut() {
  const sb = await sessionClient();
  await sb.auth.signOut();
  redirect('/admin/login');
}

export async function setLeadStatus(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('leads').update({ status: str(f, 'status') }).eq('id', str(f, 'id'));
  revalidatePath('/admin');
}

export async function saveComplex(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const name = str(f, 'name');
  const row = {
    name,
    slug: str(f, 'slug') || (await slugify(name)),
    developer_id: str(f, 'developer_id'),
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
    kadastr_status: str(f, 'kadastr_status'),
    status: str(f, 'status'),
    promised_date: date(f, 'promised_date'),
    delivered_date: date(f, 'delivered_date'),
    kadastr_months: num(f, 'kadastr_months'),
    progress: num(f, 'progress') ?? 0,
    docs_verified: bool(f, 'docs_verified'),
    published: bool(f, 'published'),
    description: str(f, 'description'),
    description_ru: str(f, 'description_ru'),
    cover_url: str(f, 'cover_url') || null,
  };
  const q = id ? sb.from('complexes').update(row).eq('id', id).select('id').single() : sb.from('complexes').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) redirect(`/admin/majmualar/${id || 'yangi'}?xato=${encodeURIComponent(error.message)}`);
  refreshPublic();
  redirect(`/admin/majmualar/${data!.id}?saqlandi=1`);
}

export async function deleteComplex(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('complexes').delete().eq('id', str(f, 'id'));
  refreshPublic();
  redirect('/admin/majmualar');
}

export async function addUnit(f: FormData) {
  const { sb } = await requireAdmin();
  const cid = str(f, 'complex_id');
  await sb.from('unit_types').insert({ complex_id: cid, rooms: num(f, 'rooms'), area: num(f, 'area'), price: num(f, 'price'), available: num(f, 'available') });
  refreshPublic();
  redirect(`/admin/majmualar/${cid}`);
}

export async function deleteUnit(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('unit_types').delete().eq('id', str(f, 'id'));
  refreshPublic();
  redirect(`/admin/majmualar/${str(f, 'complex_id')}`);
}

export async function addProgress(f: FormData) {
  const { sb } = await requireAdmin();
  const cid = str(f, 'complex_id');
  const month = str(f, 'month');
  await sb.from('progress_updates').insert({ complex_id: cid, month: month.length === 7 ? `${month}-01` : month, title: str(f, 'title'), title_ru: str(f, 'title_ru'), photo_url: str(f, 'photo_url') || null });
  refreshPublic();
  redirect(`/admin/majmualar/${cid}`);
}

export async function deleteProgress(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('progress_updates').delete().eq('id', str(f, 'id'));
  refreshPublic();
  redirect(`/admin/majmualar/${str(f, 'complex_id')}`);
}

export async function addNearby(f: FormData) {
  const { sb } = await requireAdmin();
  const cid = str(f, 'complex_id');
  await sb.from('nearby').insert({ complex_id: cid, kind: str(f, 'kind'), distance_m: num(f, 'distance_m') });
  refreshPublic();
  redirect(`/admin/majmualar/${cid}`);
}

export async function deleteNearby(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('nearby').delete().eq('id', str(f, 'id'));
  refreshPublic();
  redirect(`/admin/majmualar/${str(f, 'complex_id')}`);
}

export async function addPhoto(f: FormData) {
  const { sb } = await requireAdmin();
  const cid = str(f, 'complex_id');
  const url = str(f, 'url');
  if (url) {
    const { count } = await sb.from('complex_photos').select('id', { count: 'exact', head: true }).eq('complex_id', cid);
    await sb.from('complex_photos').insert({ complex_id: cid, url, caption: str(f, 'caption'), sort: count ?? 0 });
    refreshPublic();
  }
  redirect(`/admin/majmualar/${cid}`);
}

export async function deletePhoto(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('complex_photos').delete().eq('id', str(f, 'id'));
  refreshPublic();
  redirect(`/admin/majmualar/${str(f, 'complex_id')}`);
}

export async function saveDeveloper(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const name = str(f, 'name');
  const row = {
    name,
    slug: str(f, 'slug') || (await slugify(name)),
    initials: str(f, 'initials') || name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    city: str(f, 'city') || 'Samarqand',
    founded_year: num(f, 'founded_year'),
    description: str(f, 'description'),
    description_ru: str(f, 'description_ru'),
    verified: bool(f, 'verified'),
    delivered_total: num(f, 'delivered_total') ?? 0,
    delivered_on_time: num(f, 'delivered_on_time') ?? 0,
    sold_units: num(f, 'sold_units') ?? 0,
    avg_kadastr_months: num(f, 'avg_kadastr_months'),
    buyer_rating: num(f, 'buyer_rating'),
    review_count: num(f, 'review_count') ?? 0,
    docs_open: bool(f, 'docs_open'),
    phone: str(f, 'phone') || null,
    ...readCallHours(f),
  };
  const q = id ? sb.from('developers').update(row).eq('id', id).select('id').single() : sb.from('developers').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) redirect(`/admin/quruvchilar/${id || 'yangi'}?xato=${encodeURIComponent(error.message)}`);
  refreshPublic();
  redirect(`/admin/quruvchilar/${data!.id}?saqlandi=1`);
}

export async function deleteSampleData() {
  const { sb } = await requireAdmin();
  await sb.from('reviews').delete().eq('is_sample', true);
  await sb.from('complexes').delete().eq('is_sample', true);
  await sb.from('developers').delete().eq('is_sample', true);
  refreshPublic();
  redirect('/admin?namuna=ochirildi');
}
