import { publicClient } from './supabase';
import { som } from './format';
import { T, type Lang } from './i18n';
import { LISTING_COLS, type CallHours } from './contact';

export type ListingKind = 'ijara' | 'kunlik' | 'sotuv';

export type Listing = {
  id: string;
  owner_id: string;
  kind: ListingKind;
  title: string;
  city: string;
  district: string;
  address: string;
  lat: number | null;
  lng: number | null;
  rooms: number | null;
  area: number | null;
  floor: number | null;
  floors_total: number | null;
  price: number;
  currency: 'UZS' | 'USD';
  description: string;
  contact_name: string;
  phone?: string;
  poster_type: 'ega' | 'quruvchi';
  status: 'qoralama' | 'moderatsiya' | 'faol' | 'rad' | 'arxiv';
  verification: 'kutilmoqda' | 'tasdiqlangan' | 'rad';
  reject_reason: string;
  views: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
} & CallHours;

export type ListingWithPhotos = Listing & { listing_photos: { id: string; url: string; sort: number }[] };

export const KINDS: Record<ListingKind, { title: string; h1: string; lead: string; period: string }> = {
  ijara: { title: 'Ijara', h1: 'Samarqandda uzoq muddatli ijara', lead: "To'g'ridan-to'g'ri uy egasidan. Makler yo'q, komissiya yo'q.", period: 'oyiga' },
  kunlik: { title: 'Kunlik', h1: 'Samarqandda kunlik kvartiralar', lead: 'Sutkalik ijara egasidan, vositachisiz.', period: 'kuniga' },
  sotuv: { title: 'Sotuv', h1: 'Samarqandda uy sotuvi egasidan', lead: "Ikkilamchi bozor: makler foizisiz, to'g'ridan-to'g'ri egasidan.", period: '' },
};

export const STATUS_LABEL: Record<Listing['status'], string> = {
  qoralama: 'Qoralama',
  moderatsiya: 'Tekshiruvda',
  faol: 'Saytda',
  rad: 'Rad etildi',
  arxiv: 'Arxivda',
};

export function priceText(l: Pick<Listing, 'price' | 'currency' | 'kind'>, lang: Lang = 'uz'): string {
  const t = T(lang);
  const base = l.currency === 'USD' ? `$${som(l.price)}` : t("{n} so'm", { n: som(l.price) });
  const per = KINDS[l.kind].period;
  return per ? `${base} ${t(per)}` : base;
}

export function priceShort(l: Pick<Listing, 'price' | 'currency'>, lang: Lang = 'uz'): string {
  const t = T(lang);
  if (l.currency === 'USD') return l.price >= 1000 ? `$${(l.price / 1000).toFixed(l.price >= 100000 ? 0 : 1).replace('.0', '')}k` : `$${l.price}`;
  if (l.price >= 1_000_000) return `${(l.price / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} ${t('mln')}`;
  return `${Math.round(l.price / 1000)} ${t('ming')}`;
}

export function roomsText(l: Pick<Listing, 'rooms' | 'area' | 'floor' | 'floors_total'>, lang: Lang = 'uz'): string {
  const t = T(lang);
  const parts: string[] = [];
  if (l.rooms) parts.push(t('{n} xonali', { n: l.rooms }));
  if (l.area) parts.push(`${l.area} m²`);
  if (l.floor) parts.push(t('{n}-qavat', { n: l.floors_total ? `${l.floor}/${l.floors_total}` : l.floor }));
  return parts.join(' · ');
}

export async function getListings(kind: ListingKind): Promise<ListingWithPhotos[]> {
  const sb = publicClient();
  const { data, error } = await sb
    .from('listings')
    .select(`${LISTING_COLS}, listing_photos(id, url, sort)`)
    .eq('kind', kind)
    .eq('status', 'faol')
    .order('published_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return ((data || []) as ListingWithPhotos[]).map((l) => ({ ...l, listing_photos: [...l.listing_photos].sort((a, b) => a.sort - b.sort) }));
}

export async function getListing(id: string): Promise<ListingWithPhotos | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = publicClient();
  const { data } = await sb.from('listings').select(`${LISTING_COLS}, listing_photos(id, url, sort)`).eq('id', id).eq('status', 'faol').maybeSingle();
  if (!data) return null;
  const l = data as ListingWithPhotos;
  return { ...l, listing_photos: [...l.listing_photos].sort((a, b) => a.sort - b.sort) };
}
