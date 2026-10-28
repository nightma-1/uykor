import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MastersClient from '@/components/MastersClient';
import { getMasters } from '@/lib/masters';
import { alternates, langFrom, T } from '@/lib/i18n';

export const revalidate = 60;

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = await langFrom(params);
  const t = T(lang);
  return {
    title: t("Ustalar: ta'mir, santexnik, elektrik"),
    description: t("Samarqanddagi tekshirilgan ustalar: ta'mir, santexnika, elektrika, plitka va boshqa ishlar. Haqiqiy mijozlar sharhlari."),
    alternates: alternates(lang, '/ustalar'),
  };
}

export default async function Page({ params }: P) {
  const lang = await langFrom(params);
  const masters = await getMasters();
  return (
    <>
      <Header lang={lang} active="ustalar" />
      <MastersClient lang={lang} masters={masters} />
      <Footer lang={lang} />
    </>
  );
}
