import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompareView from '@/components/shaxmatka/CompareView';
import { getApartments } from '@/lib/shaxmatka-data';
import { alternates, langFrom, T } from '@/lib/i18n';

type P = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = await langFrom(params);
  return { title: T(lang)('Xonadonlarni taqqoslash'), alternates: alternates(lang, '/taqqoslash'), robots: { index: false } };
}

export default async function ComparePage({ params, searchParams }: P) {
  const lang = await langFrom(params);
  const t = T(lang);
  const sp = await searchParams;
  const items = await getApartments(String(sp.x || '').split(','));
  return (
    <>
      <Header lang={lang} active="novostroyka" />
      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 'clamp(24px, 3.4vw, 32px)' }}>{t('Xonadonlarni taqqoslash')}</h1>
        <CompareView lang={lang} items={items.map((i) => ({ ...i, complex: { ...i.complex, lat: Number(i.complex.lat), lng: Number(i.complex.lng), price_m2: Number(i.complex.price_m2) } }))} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
