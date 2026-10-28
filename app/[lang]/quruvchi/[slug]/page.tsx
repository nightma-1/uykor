import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getDeveloper } from '@/lib/data';
import PhoneReveal from '@/components/PhoneReveal';
import { delayMonths, dueLabel, minPrice, mln, quarter, som } from '@/lib/format';
import { alternates, langFrom, loc, lp, T } from '@/lib/i18n';

export const revalidate = 60;

type Params = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = await langFrom(params);
  const { slug } = await params;
  const t = T(lang);
  const data = await getDeveloper(slug);
  return { title: data ? t('{name}: quruvchi reytingi', { name: data.developer.name }) : t('Topilmadi'), alternates: alternates(lang, `/quruvchi/${slug}`) };
}

export default async function DeveloperPage({ params }: Params) {
  const lang = await langFrom(params);
  const { slug } = await params;
  const t = T(lang);
  const data = await getDeveloper(slug);
  if (!data) notFound();
  const { developer: d, complexes, reviews } = data;
  const building = complexes.filter((c) => c.status === 'qurilmoqda');
  const delivered = complexes.filter((c) => c.status === 'topshirilgan').sort((a, b) => (b.delivered_date || '').localeCompare(a.delivered_date || ''));
  const onTimePct = d.delivered_total ? Math.round((d.delivered_on_time / d.delivered_total) * 100) : 0;
  const kadScore = d.avg_kadastr_months != null ? Math.max(0, Math.min(100, Math.round(((12 - d.avg_kadastr_months) / 12) * 100))) : 0;
  const description = loc(d, 'description', lang);
  const factors = [
    { name: t("O'z vaqtida topshirish"), share: 40, value: t('{a} / {b} uy', { a: d.delivered_on_time, b: d.delivered_total }), pct: onTimePct },
    { name: t('Kadastr tezligi'), share: 20, value: d.avg_kadastr_months != null ? t("o'rtacha {n} oy", { n: d.avg_kadastr_months }) : t("ma'lumot yo'q"), pct: kadScore },
    { name: t('Xaridorlar bahosi'), share: 30, value: d.buyer_rating != null ? t('{r} · {n} sharh', { r: d.buyer_rating, n: d.review_count }) : t("sharh yo'q"), pct: d.buyer_rating ? Math.round((d.buyer_rating / 5) * 100) : 0 },
    { name: t('Hujjatlar ochiqligi'), share: 10, value: d.docs_open ? t("to'liq") : t('ochilmagan'), pct: d.docs_open ? 100 : 0 },
  ];

  return (
    <>
      {d.is_sample && <div className="sample-banner">{t("Sinov versiyasi: bu sahifadagi ma'lumotlar namuna.")}</div>}
      <Header lang={lang} active="quruvchilar" />
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 56, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <nav aria-label={t("Yo'l")} className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href={lp(lang, '/quruvchilar')} style={{ textDecoration: 'none' }}>{t('Quruvchilar reytingi')}</Link><span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>{d.name}</span>
        </nav>

        <section className="card" style={{ padding: 28, display: 'flex', flexWrap: 'wrap', gap: '24px 40px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '999 1 420px', minWidth: 0 }}>
            <div style={{ width: 88, height: 88, borderRadius: 20, background: 'var(--ink)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, flex: '0 0 auto' }}>{d.initials}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              {d.verified && <span className="chip turq" style={{ alignSelf: 'flex-start' }}>{t('Tekshirilgan quruvchi')}</span>}
              <h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{d.name}</h1>
              <span className="muted">{t(d.city)}{d.founded_year ? ` · ${t('{n}-yildan beri', { n: d.founded_year })}` : ''}</span>
              {description && <span style={{ whiteSpace: 'pre-line' }}>{description}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: '1 1 260px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 1, color: 'var(--lapis)' }}>{Number(d.rating).toFixed(1)}</div>
              <div className="muted" style={{ fontSize: 13 }}>{t('Uykor reytingi, 5 dan')}</div>
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}><PhoneReveal lang={lang} kind="quruvchi" id={d.id} hours={d} label={t("Sotuv bo'limi telefoni")} /></div>
          </div>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
          <section className="card section" style={{ flex: '1 1 420px', minWidth: 0, gap: 18 }}>
            <div>
              <h2 className="h2">{t('Reyting qanday hisoblangan')}</h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>{t("Reytingni pulga sotib bo'lmaydi. U faqat to'rtta faktdan tuziladi, har birining ulushi ko'rsatilgan.")}</p>
            </div>
            {factors.map((f) => (
              <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{f.name} <span className="muted" style={{ fontWeight: 400 }}>· {f.share}%</span></span>
                  <span className="num" style={{ fontWeight: 700 }}>{f.value}</span>
                </div>
                <div className="bar blue" style={{ height: 8 }}><span style={{ width: `${f.pct}%` }} /></div>
              </div>
            ))}
          </section>
          <section className="stat-grid num" style={{ flex: '1 1 420px', minWidth: 0, border: '1px solid var(--line)', borderRadius: 18 }}>
            {d.founded_year && <div style={{ padding: 20 }}><span className="v" style={{ fontSize: 28 }}>{t('{n} yil', { n: new Date().getFullYear() - d.founded_year })}</span><span className="muted" style={{ fontSize: 13 }}>{t('bozorda ({n}-yildan)', { n: d.founded_year })}</span></div>}
            <div style={{ padding: 20 }}><span className="v" style={{ fontSize: 28 }}>{t('{n} ta', { n: d.delivered_total })}</span><span className="muted" style={{ fontSize: 13 }}>{t('uy qurib topshirgan')}</span></div>
            <div style={{ padding: 20 }}><span className="v" style={{ fontSize: 28 }}>{t('{n} ta', { n: d.building_now })}</span><span className="muted" style={{ fontSize: 13 }}>{t('majmua qurilmoqda')}</span></div>
            <div style={{ padding: 20 }}><span className="v" style={{ fontSize: 28 }}>{som(d.sold_units)}</span><span className="muted" style={{ fontSize: 13 }}>{t('xonadon sotilgan')}</span></div>
            <div style={{ padding: 20 }}><span className="v" style={{ fontSize: 28 }}>{onTimePct}%</span><span className="muted" style={{ fontSize: 13 }}>{t("uylar o'z vaqtida")}</span></div>
            {d.avg_kadastr_months != null && <div style={{ padding: 20 }}><span className="v" style={{ fontSize: 28 }}>{t('~{n} oy', { n: d.avg_kadastr_months })}</span><span className="muted" style={{ fontSize: 13 }}>{t("kadastr o'rtacha")}</span></div>}
          </section>
        </div>

        {building.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="h2" style={{ fontSize: 22 }}>{t('Qurilayotgan majmualar')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {building.map((c) => (
                <Link key={c.id} href={lp(lang, `/jk/${c.slug}`)} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 130, background: '#C9D6EE' }}>{c.cover_url && <img src={c.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <strong style={{ fontSize: 16 }}>{c.name}</strong>
                    <span className="muted num" style={{ fontSize: 13 }}>{dueLabel(c, lang)} · {t("{n} mln so'mdan", { n: mln(minPrice(c)) })}</span>
                    <div className="muted num" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><div className="bar"><span style={{ width: `${c.progress}%` }} /></div>{c.progress}%</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {delivered.length > 0 && (
          <section className="card section">
            <h2 className="h2" style={{ fontSize: 22 }}>{t("Va'da va haqiqat")}</h2>
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>{t('Majmua')}</th><th>{t("Va'da qilingan")}</th><th>{t('Topshirildi')}</th><th>{t('Kadastr')}</th><th>{t('Natija')}</th></tr></thead>
                <tbody>
                  {delivered.map((c) => {
                    const late = delayMonths(c.promised_date, c.delivered_date);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}><Link href={lp(lang, `/jk/${c.slug}`)} style={{ textDecoration: 'none' }}>{c.name}</Link></td>
                        <td>{quarter(c.promised_date, lang)}</td><td>{quarter(c.delivered_date, lang)}</td>
                        <td>{c.kadastr_months ? t('{n} oyda', { n: c.kadastr_months }) : c.kadastr_status === 'bor' ? t('Chiqqan') : t('Kutilmoqda')}</td>
                        <td>{late > 0 ? <span className="chip warn">{t('{n} oy kechikdi', { n: late })}</span> : <span className="chip ok">{t("O'z vaqtida")}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 className="h2" style={{ fontSize: 22 }}>{t('Xaridorlar sharhlari')}</h2>
            <span className="muted" style={{ fontSize: 14 }}>{t('Faqat shartnomasi tekshirilgan xaridorlar yoza oladi')}</span>
          </div>
          {reviews.length === 0 ? (
            <div className="card section"><span className="muted">{t("Hozircha sharh yo'q.")}</span></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {reviews.map((r: { id: string; author_name: string; rating: number; body: string; verified: boolean; complex: { name: string } | null }) => (
                <article key={r.id} className="card section" style={{ gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{r.author_name}</strong><strong style={{ color: 'var(--lapis)' }}>★ {r.rating}</strong></div>
                  {r.verified && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--turq-ink)' }}>{t('Tasdiqlangan xaridor')}{r.complex ? ` · ${r.complex.name}` : ''}</span>}
                  <p style={{ margin: 0, color: 'var(--gray-ink)', fontSize: 14, lineHeight: 1.5 }}>{r.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer lang={lang} />
    </>
  );
}
