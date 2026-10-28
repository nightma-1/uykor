'use server';

import { revalidatePublic } from '@/lib/i18n-server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';

function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }

// Ownership documents are removed as soon as a decision is made.
async function purgeDocs(sb: Awaited<ReturnType<typeof requireAdmin>>['sb'], listingId: string) {
  const { data: docs } = await sb.from('listing_docs').select('id, path').eq('listing_id', listingId);
  if (docs && docs.length) {
    await sb.storage.from('hujjatlar').remove(docs.map((d) => d.path));
    await sb.from('listing_docs').delete().eq('listing_id', listingId);
  }
}

export async function approveListing(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const { data, error } = await sb.from('listings').update({ status: 'faol', verification: 'tasdiqlangan', reject_reason: '' }).eq('id', id).select('kind').single();
  if (error) redirect(`/admin/elonlar/${id}?xato=${encodeURIComponent(error.message)}`);
  await purgeDocs(sb, id);
  revalidatePublic(`/${data!.kind}`);
  revalidatePublic(`/elon/${id}`);
  redirect('/admin/elonlar?tasdiqlandi=1');
}

export async function rejectListing(f: FormData) {
  const { sb } = await requireAdmin();
  const id = str(f, 'id');
  const reason = str(f, 'reason') || "Ma'lumotlar tasdiqlanmadi";
  const { data } = await sb.from('listings').update({ status: 'rad', reject_reason: reason.slice(0, 300) }).eq('id', id).select('kind').single();
  await purgeDocs(sb, id);
  if (data) revalidatePublic(`/${data.kind}`);
  revalidatePublic(`/elon/${id}`);
  redirect('/admin/elonlar?rad=1');
}

export async function resolveReport(f: FormData) {
  const { sb } = await requireAdmin();
  await sb.from('listing_reports').update({ resolved: true }).eq('id', str(f, 'id'));
  redirect(`/admin/elonlar/${str(f, 'listing_id')}`);
}

export async function blockOwner(f: FormData) {
  const { sb } = await requireAdmin();
  const owner = str(f, 'owner_id');
  await sb.from('profiles').update({ blocked: true }).eq('id', owner);
  const { data } = await sb.from('listings').update({ status: 'rad', reject_reason: 'Hisob makler sifatida bloklandi' }).eq('owner_id', owner).in('status', ['faol', 'moderatsiya']).select('id, kind');
  for (const l of data || []) await purgeDocs(sb, l.id);
  ['ijara', 'kunlik', 'sotuv'].forEach((k) => revalidatePublic(`/${k}`));
  redirect('/admin/elonlar?bloklandi=1');
}
