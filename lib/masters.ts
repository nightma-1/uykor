import { publicClient } from './supabase';
import { T, type Lang } from './i18n';
import { MASTER_COLS, type CallHours } from './contact';

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

export const catLabel = (c: string, lang: Lang = 'uz') => (CATEGORIES[c] ? T(lang)(CATEGORIES[c]) : c);

export type Master = {
  id: string;
  owner_id: string | null;
  name: string;
  phone?: string;
  categories: string[];
  city: string;
  districts: string;
  experience_years: number | null;
  price_note: string;
  description: string;
  avatar_url: string | null;
  status: 'qoralama' | 'moderatsiya' | 'faol' | 'rad' | 'arxiv';
  verification: 'kutilmoqda' | 'tasdiqlangan' | 'rad';
  reject_reason: string;
  views: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
} & CallHours;

export type MasterStats = Master & { rating: number; review_count: number };

export type Review = { id: string; master_id: string; author_name: string; rating: number; body: string; status: string; created_at: string };

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function ratingText(m: Pick<MasterStats, 'rating' | 'review_count'>, lang: Lang = 'uz') {
  const t = T(lang);
  return m.review_count > 0 ? `★ ${Number(m.rating).toFixed(1)} · ${t('{n} sharh', { n: m.review_count })}` : t("Hali sharh yo'q");
}

export async function getMasters(): Promise<MasterStats[]> {
  const sb = publicClient();
  const { data, error } = await sb.from('master_stats').select(MASTER_COLS).eq('status', 'faol').limit(500);
  if (error) throw new Error(error.message);
  return ((data || []) as MasterStats[]).sort(
    (a, b) => Number(b.verification === 'tasdiqlangan') - Number(a.verification === 'tasdiqlangan') || b.rating * Math.min(b.review_count, 5) - a.rating * Math.min(a.review_count, 5) || (b.published_at || '').localeCompare(a.published_at || ''),
  );
}

export async function getMaster(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = publicClient();
  const { data: m } = await sb.from('master_stats').select(MASTER_COLS).eq('id', id).eq('status', 'faol').maybeSingle();
  if (!m) return null;
  const [{ data: photos }, { data: reviews }] = await Promise.all([
    sb.from('master_photos').select('id, url, sort').eq('master_id', id).order('sort'),
    sb.from('master_reviews').select('id, master_id, author_name, rating, body, status, created_at').eq('master_id', id).eq('status', 'faol').order('created_at', { ascending: false }),
  ]);
  return { master: m as MasterStats, photos: (photos || []) as { id: string; url: string }[], reviews: (reviews || []) as Review[] };
}
