import type { Metadata } from 'next';
import ListingsPage from '@/components/ListingsPage';
import { alternates, langFrom, T } from '@/lib/i18n';

export const revalidate = 60;

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = await langFrom(params);
  const t = T(lang);
  return { title: t('Uy sotuvi egasidan, maklersiz'), description: t("Samarqandda kvartira va uylar sotuvi: to'g'ridan-to'g'ri egasidan, makler foizisiz."), alternates: alternates(lang, '/sotuv') };
}

export default async function Page({ params }: P) {
  return <ListingsPage lang={await langFrom(params)} kind="sotuv" />;
}
