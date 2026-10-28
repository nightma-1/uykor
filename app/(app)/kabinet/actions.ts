'use server';

import { revalidatePublic } from '@/lib/i18n-server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase-server';
import { readCallHours } from '@/lib/contact';

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }
function num(f: FormData, k: string) { const v = str(f, k).replace(/\s/g, '').replace(',', '.'); return v === '' ? null : Number(v); }

function back(id: string, q = '') { redirect(`/kabinet/elon/${id}${q}`); }

export async function saveProfile(f: FormData) {
  const { sb, user } = await requireUser();
  const row = {
    id: user.id,
    full_name: str(f, 'full_name').slice(0, 80),
    phone: str(f, 'phone').slice(0, 20),
    account_type: str(f, 'account_type') === 'quruvchi' ? 'quruvchi' : 'ega',
    company: str(f, 'company').slice(0, 100),
  };
  const { error } = await sb.from('profiles').upsert(row);
  const next = str(f, 'keyin');
  if (error) redirect(`/kabinet?xato=${encodeURIComponent(error.message)}`);
  redirect(next && next.startsWith('/kabinet') ? next : '/kabinet?saqlandi=1');
}

export async function saveListing(f: FormData) {
  const { sb, user } = await requireUser();
  const id = str(f, 'id');
  const { data: prof } = await sb.from('profiles').select('full_name, phone, account_type').eq('id', user.id).maybeSingle();
  const kind = ['ijara', 'kunlik', 'sotuv'].includes(str(f, 'kind')) ? str(f, 'kind') : 'ijara';
  const row = {
    kind,
    title: str(f, 'title').slice(0, 120),
    district: str(f, 'district').slice(0, 80),
    address: str(f, 'address').slice(0, 160),
    lat: num(f, 'lat'),
    lng: num(f, 'lng'),
    rooms: num(f, 'rooms'),
    area: num(f, 'area'),
    floor: num(f, 'floor'),
    floors_total: num(f, 'floors_total'),
    price: num(f, 'price'),
    currency: str(f, 'currency') === 'USD' ? 'USD' : 'UZS',
    description: str(f, 'description').slice(0, 4000),
    contact_name: (str(f, 'contact_name') || prof?.full_name || '').slice(0, 80),
    phone: (str(f, 'phone') || prof?.phone || '').slice(0, 20),
    poster_type: prof?.account_type === 'quruvchi' ? 'quruvchi' : 'ega',
    ...readCallHours(f),
  };
  if (!row.price || row.price <= 0) back(id || 'yangi', `?xato=${encodeURIComponent("Narxni kiriting")}&tur=${kind}`);
  if (row.title.length < 5) back(id || 'yangi', `?xato=${encodeURIComponent("Sarlavha kamida 5 ta harf bo'lsin")}&tur=${kind}`);
  if (id) {
    const { error } = await sb.from('listings').update(row).eq('id', id);
    if (error) back(id, `?xato=${encodeURIComponent(error.message)}`);
    revalidatePublic(`/elon/${id}`);
    revalidatePublic(`/${kind}`);
    back(id, '?saqlandi=1');
  } else {
    const { data, error } = await sb.from('listings').insert({ ...row, owner_id: user.id, status: 'qoralama' }).select('id').single();
    if (error) back('yangi', `?xato=${encodeURIComponent(error.message)}&tur=${kind}`);
    back(data!.id, '?yangi=1');
  }
}

export async function addListingPhoto(f: FormData) {
  const { sb } = await requireUser();
  const id = str(f, 'listing_id');
  const url = str(f, 'url');
  if (url) {
    const { count } = await sb.from('listing_photos').select('id', { count: 'exact', head: true }).eq('listing_id', id);
    if ((count ?? 0) >= 15) back(id, `?xato=${encodeURIComponent('Eng ko\'pi 15 ta rasm')}`);
    await sb.from('listing_photos').insert({ listing_id: id, url, sort: count ?? 0 });
    revalidatePublic(`/elon/${id}`);
  }
  back(id);
}

export async function deleteListingPhoto(f: FormData) {
  const { sb, user } = await requireUser();
  const id = str(f, 'listing_id');
  const url = str(f, 'url');
  await sb.from('listing_photos').delete().eq('id', str(f, 'id'));
  const marker = '/elonlar/';
  const i = url.indexOf(marker);
  if (i >= 0) {
    const path = url.slice(i + marker.length);
    if (path.startsWith(`${user.id}/`)) await sb.storage.from('elonlar').remove([path]);
  }
  revalidatePublic(`/elon/${id}`);
  back(id);
}

export async function addDoc(f: FormData) {
  const { sb, user } = await requireUser();
  const id = str(f, 'listing_id');
  const path = str(f, 'path');
  const kind = ['kadastr', 'pasport', 'boshqa'].includes(str(f, 'kind')) ? str(f, 'kind') : 'boshqa';
  if (path && path.startsWith(`${user.id}/`)) await sb.from('listing_docs').insert({ listing_id: id, kind, path });
  back(id);
}

export async function deleteDoc(f: FormData) {
  const { sb, user } = await requireUser();
  const id = str(f, 'listing_id');
  const { data: doc } = await sb.from('listing_docs').select('path').eq('id', str(f, 'id')).maybeSingle();
  if (doc) {
    if (doc.path.startsWith(`${user.id}/`)) await sb.storage.from('hujjatlar').remove([doc.path]);
    await sb.from('listing_docs').delete().eq('id', str(f, 'id'));
  }
  back(id);
}

export async function submitListing(f: FormData) {
  const { sb } = await requireUser();
  const id = str(f, 'listing_id');
  const [{ data: l }, { count: photos }, { data: docs }, { data: phone }] = await Promise.all([
    sb.from('listings').select('lat, lng, verification').eq('id', id).maybeSingle(),
    sb.from('listing_photos').select('id', { count: 'exact', head: true }).eq('listing_id', id),
    sb.from('listing_docs').select('kind').eq('listing_id', id),
    sb.rpc('my_contact', { kind: 'elon', rid: id }),
  ]);
  const kinds = new Set((docs || []).map((d) => d.kind));
  const missing: string[] = [];
  if (!l?.lat || !l?.lng) missing.push('xaritadagi joy');
  if (!phone) missing.push('telefon raqam');
  if (!photos) missing.push('kamida 1 ta rasm');
  if (l?.verification !== 'tasdiqlangan' && !kinds.has('kadastr')) missing.push('kadastr hujjati rasmi');
  if (l?.verification !== 'tasdiqlangan' && !kinds.has('pasport')) missing.push('pasport rasmi');
  if (missing.length) back(id, `?xato=${encodeURIComponent('Yetishmayapti: ' + missing.join(', '))}`);
  const { error } = await sb.from('listings').update({ status: 'moderatsiya' }).eq('id', id);
  if (error) back(id, `?xato=${encodeURIComponent(error.message)}`);
  back(id, '?yuborildi=1');
}

export async function setListingStatus(f: FormData) {
  const { sb } = await requireUser();
  const id = str(f, 'listing_id');
  const status = str(f, 'status');
  if (!['arxiv', 'faol', 'qoralama'].includes(status)) back(id);
  const { data } = await sb.from('listings').select('kind').eq('id', id).maybeSingle();
  const { error } = await sb.from('listings').update({ status }).eq('id', id);
  if (data) revalidatePublic(`/${data.kind}`);
  revalidatePublic(`/elon/${id}`);
  if (error) back(id, `?xato=${encodeURIComponent(error.message)}`);
  redirect('/kabinet');
}

export async function deleteListing(f: FormData) {
  const { sb, user } = await requireUser();
  const id = str(f, 'listing_id');
  const [{ data: photos }, { data: docs }, { data: l }] = await Promise.all([
    sb.from('listing_photos').select('url').eq('listing_id', id),
    sb.from('listing_docs').select('path').eq('listing_id', id),
    sb.from('listings').select('kind').eq('id', id).maybeSingle(),
  ]);
  const marker = '/elonlar/';
  const photoPaths = (photos || []).map((p) => p.url.slice(p.url.indexOf(marker) + marker.length)).filter((p) => p.startsWith(`${user.id}/`));
  if (photoPaths.length) await sb.storage.from('elonlar').remove(photoPaths);
  const docPaths = (docs || []).map((d) => d.path).filter((p) => p.startsWith(`${user.id}/`));
  if (docPaths.length) await sb.storage.from('hujjatlar').remove(docPaths);
  await sb.from('listings').delete().eq('id', id);
  if (l) revalidatePublic(`/${l.kind}`);
  redirect('/kabinet?ochirildi=1');
}
