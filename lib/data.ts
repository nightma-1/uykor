import { publicClient } from './supabase';
import { DEVELOPER_COLS } from './contact';
import type { ComplexWithDev, Developer, Complex, UnitType } from './types';

export async function getDevelopers(): Promise<Developer[]> {
  const sb = publicClient();
  const { data, error } = await sb.from('developer_stats').select(DEVELOPER_COLS).order('rating', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Developer[];
}

export async function getComplexes(): Promise<ComplexWithDev[]> {
  const sb = publicClient();
  const [{ data: cx, error }, devs] = await Promise.all([
    sb.from('complexes').select('*, unit_types(*)').eq('published', true),
    getDevelopers(),
  ]);
  if (error) throw new Error(error.message);
  const byId = new Map(devs.map((d) => [d.id, d]));
  return ((cx || []) as (Complex & { unit_types: UnitType[] })[])
    .map((c) => {
      const d = byId.get(c.developer_id);
      return {
        ...c,
        unit_types: [...(c.unit_types || [])].sort((a, b) => a.rooms - b.rooms),
        developer: { slug: d?.slug ?? '', name: d?.name ?? '', initials: d?.initials ?? '', rating: d?.rating ?? 0 },
      };
    })
    .sort((a, b) => b.developer.rating - a.developer.rating);
}

export async function getComplex(slug: string) {
  const sb = publicClient();
  const { data: c } = await sb.from('complexes').select('*, unit_types(*), progress_updates(*), nearby(*), complex_photos(*)').eq('slug', slug).eq('published', true).maybeSingle();
  if (!c) return null;
  const { data: dev } = await sb.from('developer_stats').select(DEVELOPER_COLS).eq('id', c.developer_id).maybeSingle();
  const { data: history } = await sb
    .from('complexes')
    .select('name, slug, promised_date, delivered_date, kadastr_months')
    .eq('developer_id', c.developer_id)
    .eq('status', 'topshirilgan')
    .order('delivered_date', { ascending: false })
    .limit(5);
  const { data: reviews } = await sb.from('reviews').select('rating').eq('complex_id', c.id);
  return {
    complex: {
      ...c,
      unit_types: [...(c.unit_types || [])].sort((a: UnitType, b: UnitType) => a.rooms - b.rooms),
      progress_updates: [...(c.progress_updates || [])].sort((a: { month: string }, b: { month: string }) => a.month.localeCompare(b.month)),
      complex_photos: [...(c.complex_photos || [])].sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort) as { id: string; url: string; caption: string }[],
    },
    developer: dev as Developer,
    history: history || [],
    reviewCount: (reviews || []).length,
  };
}

export async function getDeveloper(slug: string) {
  const sb = publicClient();
  const { data: dev } = await sb.from('developer_stats').select(DEVELOPER_COLS).eq('slug', slug).maybeSingle();
  if (!dev) return null;
  const [{ data: complexes }, { data: reviews }] = await Promise.all([
    sb.from('complexes').select('*, unit_types(*)').eq('developer_id', dev.id).eq('published', true),
    sb.from('reviews').select('*, complex:complexes(name)').eq('developer_id', dev.id).eq('published', true).order('created_at', { ascending: false }),
  ]);
  return { developer: dev as Developer, complexes: (complexes || []) as (Complex & { unit_types: UnitType[] })[], reviews: reviews || [] };
}
