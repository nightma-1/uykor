import type { MetadataRoute } from 'next';
import { publicClient } from '@/lib/supabase';
import { SITE } from '@/lib/i18n';

export const revalidate = 3600;

type Entry = { path: string; lastModified?: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = publicClient();
  const [{ data: cx }, { data: devs }, { data: ls }, { data: ms }] = await Promise.all([
    sb.from('complexes').select('slug, created_at').eq('published', true),
    sb.from('developers').select('slug, created_at'),
    sb.from('listings').select('id, updated_at').eq('status', 'faol').limit(5000),
    sb.from('masters').select('id, updated_at').eq('status', 'faol').limit(5000),
  ]);
  const entries: Entry[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/ijara', changeFrequency: 'daily', priority: 0.8 },
    { path: '/kunlik', changeFrequency: 'daily', priority: 0.8 },
    { path: '/sotuv', changeFrequency: 'daily', priority: 0.8 },
    { path: '/ustalar', changeFrequency: 'daily', priority: 0.8 },
    { path: '/quruvchilar', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/quruvchilarga', changeFrequency: 'monthly', priority: 0.5 },
    ...(cx || []).map((c) => ({ path: `/jk/${c.slug}`, lastModified: c.created_at, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...(devs || []).map((d) => ({ path: `/quruvchi/${d.slug}`, lastModified: d.created_at, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...(ls || []).map((l) => ({ path: `/elon/${l.id}`, lastModified: l.updated_at, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...(ms || []).map((m) => ({ path: `/usta/${m.id}`, lastModified: m.updated_at, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
  const url = (lang: 'uz' | 'ru', p: string) => (lang === 'uz' ? `${SITE}${p === '/' ? '' : p}` : `${SITE}/ru${p === '/' ? '' : p}`);
  return entries.flatMap((e) =>
    (['uz', 'ru'] as const).map((lang) => ({
      url: url(lang, e.path),
      lastModified: e.lastModified,
      changeFrequency: e.changeFrequency,
      priority: lang === 'uz' ? e.priority : Math.max(0.1, e.priority - 0.1),
      alternates: { languages: { uz: url('uz', e.path), ru: url('ru', e.path) } },
    })),
  );
}
