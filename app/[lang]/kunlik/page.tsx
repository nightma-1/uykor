import type { Metadata } from 'next';
import ListingsPage from '@/components/ListingsPage';
import { alternates, langFrom, T } from '@/lib/i18n';

export const revalidate = 60;

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = await langFrom(params);
  const t = T(lang);
  return { title: t('Kunlik kvartiralar egasidan'), description: t('Samarqandda sutkalik kvartiralar: egasidan, vositachisiz.'), alternates: alternates(lang, '/kunlik') };
}

export default async function Page({ params }: P) {
  return <ListingsPage lang={await langFrom(params)} kind="kunlik" />;
}
