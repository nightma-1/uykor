import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeClient from '@/components/HomeClient';
import { getComplexes } from '@/lib/data';
import { isLang, T, type Lang } from '@/lib/i18n';

export const revalidate = 60;

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'uz';
  const t = T(lang);
  const complexes = await getComplexes();
  const hasSample = complexes.some((c) => c.is_sample);
  return (
    <>
      {hasSample && <div className="sample-banner">{t("Sinov versiyasi: saytdagi majmualar va quruvchilar namuna ma'lumotlar.")}</div>}
      <Header lang={lang} active="novostroyka" />
      <HomeClient lang={lang} complexes={complexes} />
      <Footer lang={lang} />
    </>
  );
}
