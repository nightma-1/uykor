import { sb } from './supabase';
import type { ComplexCard, ComplexFull, Developer, Listing, ListingKind, Master, Review } from './types';

const byRooms = <T extends { rooms: number }>(a: T, b: T) => a.rooms - b.rooms;
const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

export const UUID = /^[0-9a-f-]{36}$/;

export async function getDevelopers(): Promise<Developer[]> {
  const { data, error } = await sb.from('developer_stats').select('*').order('rating', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Developer[];
}

export async function getComplexes(): Promise<ComplexCard[]> {
  const [{ data, error }, devs] = await Promise.all([
    sb.from('complexes').select('*, unit_types(*)').eq('published', true),
    getDevelopers(),
  ]);
  if (error) throw new Error(error.message);
  const byId = new Map(devs.map((d) => [d.id, d]));
  return ((data || []) as ComplexCard[])
    .map((c) => {
      const d = byId.get(c.developer_id);
      return {
        ...c,
        unit_types: [...(c.unit_types || [])].sort(byRooms),
        developer: { slug: d?.slug ?? '', name: d?.name ?? '', initials: d?.initials ?? '', rating: Number(d?.rating ?? 0) },
      };
    })
    .sort((a, b) => b.developer.rating - a.developer.rating);
}

export async function getComplex(slug: string) {
  const { data: c } = await sb
    .from('complexes')
    .select('*, unit_types(*), progress_updates(*), nearby(*), complex_photos(*)')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (!c) return null;
  const cx = c as ComplexFull;
  const [{ data: dev }, { data: history }] = await Promise.all([
    sb.from('developer_stats').select('*').eq('id', cx.developer_id).maybeSingle(),
    sb.from('complexes').select('name, slug, promised_date, delivered_date').eq('developer_id', cx.developer_id).eq('status', 'topshirilgan').order('delivered_date', { ascending: false }).limit(5),
  ]);
  return {
    complex: {
      ...cx,
      unit_types: [...(cx.unit_types || [])].sort(byRooms),
      progress_updates: [...(cx.progress_updates || [])].sort((a, b) => a.month.localeCompare(b.month)),
      complex_photos: [...(cx.complex_photos || [])].sort(bySort),
    },
    developer: dev as Developer | null,
    history: (history || []) as { name: string; slug: string; promised_date: string | null; delivered_date: string | null }[],
  };
}

export async function getDeveloper(slug: string) {
  const { data: dev } = await sb.from('developer_stats').select('*').eq('slug', slug).maybeSingle();
  if (!dev) return null;
  const [{ data: complexes }, { data: reviews }] = await Promise.all([
    sb.from('complexes').select('*, unit_types(*)').eq('developer_id', dev.id).eq('published', true),
    sb.from('reviews').select('id, author_name, rating, body, verified, created_at, complex:complexes(name)').eq('developer_id', dev.id).eq('published', true).order('created_at', { ascending: false }),
  ]);
  return {
    developer: dev as Developer,
    complexes: (complexes || []) as ComplexCard[],
    reviews: (reviews || []) as unknown as (Review & { verified: boolean; complex: { name: string } | null })[],
  };
}

export async function getListings(kind: ListingKind): Promise<Listing[]> {
  const { data, error } = await sb
    .from('listings')
    .select('*, listing_photos(id, url, sort)')
    .eq('kind', kind)
    .eq('status', 'faol')
    .order('published_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return ((data || []) as Listing[]).map((l) => ({ ...l, listing_photos: [...l.listing_photos].sort(bySort) }));
}

export async function getListing(id: string): Promise<Listing | null> {
  if (!UUID.test(id)) return null;
  const { data } = await sb.from('listings').select('*, listing_photos(id, url, sort)').eq('id', id).eq('status', 'faol').maybeSingle();
  if (!data) return null;
  const l = data as Listing;
  return { ...l, listing_photos: [...l.listing_photos].sort(bySort) };
}

export async function getMasters(): Promise<Master[]> {
  const { data, error } = await sb.from('master_stats').select('*').eq('status', 'faol').limit(500);
  if (error) throw new Error(error.message);
  return ((data || []) as Master[]).sort(
    (a, b) =>
      Number(b.verification === 'tasdiqlangan') - Number(a.verification === 'tasdiqlangan') ||
      b.rating * Math.min(b.review_count, 5) - a.rating * Math.min(a.review_count, 5) ||
      (b.published_at || '').localeCompare(a.published_at || ''),
  );
}

export async function getMaster(id: string) {
  if (!UUID.test(id)) return null;
  const { data: m } = await sb.from('master_stats').select('*').eq('id', id).eq('status', 'faol').maybeSingle();
  if (!m) return null;
  const [{ data: photos }, { data: reviews }] = await Promise.all([
    sb.from('master_photos').select('id, url, sort').eq('master_id', id).order('sort'),
    sb.from('master_reviews').select('id, author_name, rating, body, created_at').eq('master_id', id).eq('status', 'faol').order('created_at', { ascending: false }),
  ]);
  return { master: m as Master, photos: (photos || []) as { id: string; url: string }[], reviews: (reviews || []) as Review[] };
}

export type ContactResult = { open: boolean; phone: string | null; none?: boolean };

/** Phone numbers are given out only during the owner's calling hours (server decides). */
export async function contactPhone(kind: 'elon' | 'usta' | 'quruvchi', id: string): Promise<ContactResult | null> {
  const { data, error } = await sb.rpc('contact_phone', { kind, rid: id });
  if (error) return null;
  return data as ContactResult;
}

export async function callHours(table: 'listings' | 'masters' | 'developers', id: string) {
  const { data } = await sb.from(table).select('call_days, call_from, call_to').eq('id', id).maybeSingle();
  return data as { call_days: number[] | null; call_from: string | null; call_to: string | null } | null;
}

export const CATEGORIES: Record<string, string> = {
  tamir: "Uy ta'miri (remont)",
  santexnik: 'Santexnik',
  elektrik: 'Elektrik',
  plitka: 'Plitka va kafel',
  boyoq: "Bo'yoq va shpaklyovka",
  gipsokarton: 'Gipsokarton',
  pol: 'Pol (laminat, parket)',
  mebel: 'Mebel yasash',
  eshik: 'Eshik va deraza',
  konditsioner: 'Konditsioner',
  isitish: 'Isitish va kotyol',
  payvand: 'Payvandchi',
  tom: 'Tom yopish',
  tozalash: 'Uy tozalash',
};
