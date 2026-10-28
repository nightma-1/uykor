'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase-server';

const BASE = '/kabinet/sevimlilar';
function str(f: FormData, k: string) { return String(f.get(k) ?? '').trim(); }

export async function addAlert(f: FormData) {
  const { sb, user } = await requireUser(BASE);
  const kind = ['ijara', 'kunlik', 'sotuv', 'majmua'].includes(str(f, 'kind')) ? str(f, 'kind') : 'ijara';
  const rooms = Number(str(f, 'rooms')) || null;
  const raw = Number(str(f, 'max_price').replace(/\s/g, '').replace(',', '.'));
  const currency = kind === 'majmua' ? 'UZS' : str(f, 'currency') === 'USD' ? 'USD' : 'UZS';
  // Prices are typed in millions of so'm (for complexes: per m²) or in dollars.
  const max = raw > 0 ? Math.round(currency === 'USD' ? raw : raw * 1_000_000) : null;
  const { error } = await sb.from('alerts').insert({
    user_id: user.id,
    kind,
    rooms: kind === 'majmua' ? null : rooms && rooms >= 1 && rooms <= 4 ? rooms : null,
    max_price: max,
    currency,
    district: str(f, 'district').slice(0, 60),
  });
  revalidatePath(BASE);
  redirect(`${BASE}?${error ? 'xato=' + encodeURIComponent('Eslatma saqlanmadi (eng ko\'pi 10 ta)') : 'eslatma=1'}`);
}

export async function deleteAlert(f: FormData) {
  const { sb } = await requireUser(BASE);
  await sb.from('alerts').delete().eq('id', str(f, 'id'));
  revalidatePath(BASE);
  redirect(BASE);
}

export async function removeFavorite(f: FormData) {
  const { sb, user } = await requireUser(BASE);
  await sb.from('favorites').delete().eq('user_id', user.id).eq('item_type', str(f, 'type')).eq('item_id', str(f, 'id'));
  revalidatePath(BASE);
  redirect(BASE);
}
