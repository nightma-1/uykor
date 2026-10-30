import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApartmentView from '@/components/shaxmatka/ApartmentView';
import { getApartment } from '@/lib/shaxmatka-data';
import { aptPrice } from '@/lib/shaxmatka';
import { publicClient } from '@/lib/supabase';
import { mln } from '@/lib/format';
import { alternates, langFrom, lp, T } from '@/lib/i18n';

export const revalidate = 60;

type Params = { params: Promise<{ lang: string; slug: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = await langFrom(params);
  const { slug, id } = await params;
  const t = T(lang);
  const d = await getApartment(id);
  if (!d || d.complex.slug !== slug) return { title: t('Topilmadi') };
  const a = d.apartment;
  const title = `${d.complex.name}: ${t('{n} xonali', { n: a.rooms })}, ${a.area} m², ${t('{n}-qavat', { n: a.floor })}`;
  return {
    title,
    description: t("Xonadon № {n}: {price} mln so'm, bo'lib to'lash {months} oygacha. To'g'ridan-to'g'ri quruvchidan, maklersiz.", {
      n: a.number, price: mln(aptPrice(a, d.complex.price_m2), 1), months: d.complex.installment_months,
    }),
    alternates: alternates(lang, `/jk/${slug}/xonadon/${id}`),
    robots: a.status === 'sotilgan' || a.status === 'yopiq' ? { index: false } : undefined,
  };
}

export default async function ApartmentPage({ params }: Params) {
  const lang = await langFrom(params);
  const { slug, id } = await params;
  const t = T(lang);
  const d = await getApartment(id);
  if (!d || d.complex.slug !== slug) notFound();
  const { apartment: a, block, plan, complex: c, floorApartments } = d;
  const { count } = await publicClient().from('complex_blocks').select('id', { count: 'exact', head: true }).eq('complex_id', c.id);
  const showBlock = (count ?? 1) > 1;

  return (
    <>
      {c.is_sample && <div className="sample-banner">{t("Sinov versiyasi: bu sahifadagi ma'lumotlar namuna.")}</div>}
      <Header lang={lang} active="novostroyka" />
      <main className="wrap" style={{ paddingTop: 20, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <nav aria-label={t("Yo'l")} className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href={lp(lang, '/')} style={{ textDecoration: 'none' }}>{t('Novostroykalar')}</Link><span aria-hidden="true">/</span>
          <Link href={lp(lang, `/jk/${c.slug}`)} style={{ textDecoration: 'none' }}>{c.name}</Link><span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>{t('Xonadon № {n}', { n: a.number })}</span>
        </nav>
        <div>
          <h1 className="display" style={{ margin: 0, fontSize: 'clamp(24px, 3.4vw, 32px)' }}>{t('{n} xonali', { n: a.rooms })}, {a.area} m² · {c.name}</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>{t(c.city)}, {c.address}{showBlock ? ` · ${t('{name} blok', { name: block.name })}` : ''} · {t('{f}-qavat, {n} dan', { f: a.floor, n: block.floors })}</p>
        </div>
        <ApartmentView
          lang={lang}
          complex={{ id: c.id, slug: c.slug, name: c.name, lat: Number(c.lat), lng: Number(c.lng), price_m2: Number(c.price_m2), installment_months: c.installment_months, first_payment_pct: c.first_payment_pct }}
          block={block}
          plan={plan}
          apartment={a}
          floorApartments={floorApartments}
          showBlock={showBlock}
        />
      </main>
      <Footer lang={lang} />
    </>
  );
}
