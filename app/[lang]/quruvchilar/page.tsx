import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getDevelopers } from '@/lib/data';
import { som } from '@/lib/format';
import { alternates, langFrom, lp, T } from '@/lib/i18n';

export const revalidate = 60;

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = await langFrom(params);
  return { title: T(lang)('Quruvchilar reytingi'), alternates: alternates(lang, '/quruvchilar') };
}

export default async function DevelopersPage({ params }: P) {
  const lang = await langFrom(params);
  const t = T(lang);
  const devs = await getDevelopers();
  return (
    <>
      {devs.some((d) => d.is_sample) && <div className="sample-banner">{t("Sinov versiyasi: quruvchilar namuna ma'lumotlar.")}</div>}
      <Header lang={lang} active="quruvchilar" />
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{t('Quruvchilar reytingi')}</h1>
          <p className="muted" style={{ margin: '8px 0 0', maxWidth: 680, fontSize: 16 }}>
            {t("Reyting to'rtta faktdan hisoblanadi: o'z vaqtida topshirish (40%), xaridorlar bahosi (30%), kadastr tezligi (20%) va hujjatlar ochiqligi (10%). Uni pulga sotib bo'lmaydi.")}
          </p>
        </div>
        <div className="card table-wrap">
          <table className="t" style={{ minWidth: 720 }}>
            <thead><tr><th>#</th><th>{t('Quruvchi')}</th><th>{t('Reyting')}</th><th>{t("O'z vaqtida")}</th><th>{t('Kadastr')}</th><th>{t('Sotilgan')}</th><th>{t('Qurilmoqda')}</th></tr></thead>
            <tbody>
              {devs.map((d, i) => (
                <tr key={d.id}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <Link href={lp(lang, `/quruvchi/${d.slug}`)} style={{ fontWeight: 600, textDecoration: 'none' }}>{d.name}</Link>
                    {d.verified && <span className="chip turq" style={{ marginLeft: 8 }}>{t('Tekshirilgan')}</span>}
                  </td>
                  <td><span className="rating">★ {Number(d.rating).toFixed(1)}</span></td>
                  <td>{d.delivered_on_time} / {d.delivered_total}</td>
                  <td>{d.avg_kadastr_months != null ? t('~{n} oy', { n: d.avg_kadastr_months }) : '—'}</td>
                  <td>{som(d.sold_units)}</td>
                  <td>{t('{n} ta', { n: d.building_now })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer lang={lang} />
    </>
  );
}
