import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Calculator from '@/components/Calculator';
import LeadForm from '@/components/LeadForm';
import FavoriteButton from '@/components/FavoriteButton';
import MiniMap from '@/components/MiniMap';
import PhoneReveal from '@/components/PhoneReveal';
import { getComplex } from '@/lib/data';
import { getShaxmatka } from '@/lib/shaxmatka-data';
import Shaxmatka from '@/components/shaxmatka/Shaxmatka';
import { delayMonths, dueLabel, minPrice, mln, monthYear, quarter, som } from '@/lib/format';
import { alternates, langFrom, loc, lp, T, type Lang } from '@/lib/i18n';
import type { UnitType } from '@/lib/types';

export const revalidate = 60;

type Params = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = await langFrom(params);
  const { slug } = await params;
  const t = T(lang);
  const data = await getComplex(slug);
  if (!data) return { title: t('Topilmadi') };
  const c = data.complex;
  return {
    title: c.name,
    description: t("{name}, {district}: {price} mln so'm/m², {months} oygacha bo'lib to'lash.", { name: c.name, district: c.district, price: mln(c.price_m2, 1), months: c.installment_months }),
    alternates: alternates(lang, `/jk/${slug}`),
  };
}

function Gallery({ name, photos, empty, countLabel }: { name: string; photos: { id: string; url: string; caption: string }[]; empty: string; countLabel: string }) {
  if (photos.length === 0) {
    return <div className="gallery single"><div>{empty}</div></div>;
  }
  const shown = photos.slice(0, 5);
  return (
    <div className={`gallery${shown.length < 5 ? ' single' : ''}`}>
      {(shown.length < 5 ? shown.slice(0, 1) : shown).map((p, i) => (
        <div key={p.id} style={{ position: 'relative' }}>
          <img src={p.url} alt={p.caption || name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {i === 0 && photos.length > 1 && (
            <span className="chip gray" style={{ position: 'absolute', right: 10, bottom: 10 }}>{countLabel}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function fmtDist(m: number, lang: Lang) {
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace('.', ',')} ${lang === 'ru' ? 'км' : 'km'}`;
  return `${m} ${lang === 'ru' ? 'м' : 'm'}`;
}

export default async function JkPage({ params }: Params) {
  const lang = await langFrom(params);
  const { slug } = await params;
  const t = T(lang);
  const data = await getComplex(slug);
  if (!data) notFound();
  const { complex: c, developer: d, history } = data;
  const shx = await getShaxmatka(c.id);
  const hasShx = shx.blocks.length > 0 && shx.apartments.length > 0;
  const freeApts = shx.apartments.filter((a) => a.status === 'sotuvda');
  const units = c.unit_types as UnitType[];
  const roomsList = units.map((u) => u.rooms);
  const from = freeApts.length ? Math.min(...freeApts.map((a) => a.price ?? a.area * c.price_m2)) : minPrice(c);
  const description = loc(c, 'description', lang);

  return (
    <>
      {c.is_sample && <div className="sample-banner">{t("Sinov versiyasi: bu sahifadagi ma'lumotlar namuna.")}</div>}
      <Header lang={lang} active="novostroyka" />
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <nav aria-label={t("Yo'l")} className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href={lp(lang, '/')} style={{ textDecoration: 'none' }}>{t('Novostroykalar')}</Link><span aria-hidden="true">/</span>
          <span>{t(c.city)}</span><span aria-hidden="true">/</span><span style={{ color: 'var(--ink)' }}>{c.name}</span>
        </nav>

        <Gallery
          name={c.name}
          empty={t('Majmua rasmlari tez orada')}
          countLabel={t('{n} ta rasm', { n: c.complex_photos.length + (c.cover_url ? 1 : 0) })}
          photos={[
            ...(c.cover_url ? [{ id: 'cover', url: c.cover_url as string, caption: c.name as string }] : []),
            ...c.complex_photos,
          ]}
        />

        <div className="two-col">
          <div className="main">
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {c.docs_verified && <span className="chip turq">{t('Hujjatlar tekshirilgan')}</span>}
                {c.kadastr_status === 'bor' ? <span className="chip ok">{t('Kadastr chiqqan')}</span> : <span className="chip warn">{t('Kadastr jarayonda')}</span>}
                {c.status === 'topshirilgan' && <span className="chip gray">{t('Topshirilgan')}</span>}
              </div>
              <div className="title-row"><h1 className="display" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 36px)' }}>{c.name}</h1><FavoriteButton lang={lang} type="majmua" id={c.id} variant="button" /></div>
              <p className="muted" style={{ margin: 0 }}>
                {t(c.city)}, {c.address}
                {c.blocks ? ` · ${t('{n} blok', { n: c.blocks })}` : ''}{c.floors ? `, ${t('{n} qavat', { n: c.floors })}` : ''}
                {roomsList.length ? ` · ${t('{n} xonali', { n: `${Math.min(...roomsList)}–${Math.max(...roomsList)}` })}` : ''}
                {c.area_min && c.area_max ? `, ${c.area_min}–${c.area_max} m²` : ''}
              </p>
              {description && <p style={{ margin: 0, maxWidth: 680, whiteSpace: 'pre-line' }}>{description}</p>}
            </section>

            <section className="card facts num">
              <div><span className="eyebrow">{t('1 m² narxi')}</span><span className="v">{t("{n} mln so'm", { n: mln(c.price_m2, 1) })}</span></div>
              <div><span className="eyebrow">{t("Bo'lib to'lash")}</span><span className="v">{c.installment_months ? t('{n} oygacha', { n: c.installment_months }) : t("Yo'q")}</span>{c.installment_months > 0 && <span className="muted" style={{ fontSize: 12 }}>{t("boshlang'ich {n}% dan", { n: c.first_payment_pct })}</span>}</div>
              <div><span className="eyebrow">{t('Topshirish')}</span><span className="v">{dueLabel(c, lang)}</span>{c.status === 'topshirilgan' && c.delivered_date && <span className="muted" style={{ fontSize: 12 }}>{monthYear(c.delivered_date, lang)}</span>}</div>
              <div><span className="eyebrow">{t('Kadastr')}</span><span className="v">{c.kadastr_status === 'bor' ? t('Chiqqan') : t('Jarayonda')}</span>{d?.avg_kadastr_months && c.kadastr_status !== 'bor' ? <span className="muted" style={{ fontSize: 12 }}>{t("quruvchida o'rtacha ~{n} oy", { n: d.avg_kadastr_months })}</span> : null}</div>
            </section>

            {hasShx && (
              <Shaxmatka
                lang={lang}
                data={shx}
                complex={{ id: c.id, slug: c.slug, name: c.name, lat: c.lat, lng: c.lng, price_m2: c.price_m2, installment_months: c.installment_months, first_payment_pct: c.first_payment_pct }}
              />
            )}

            {c.status === 'qurilmoqda' && (
              <section className="card section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <h2 className="h2">{t('Qurilish jarayoni')}</h2>
                  <span className="num" style={{ color: 'var(--turq-ink)', fontWeight: 700 }}>{t('{n}% bajarilgan', { n: c.progress })}</span>
                </div>
                <div className="bar thick"><span style={{ width: `${c.progress}%` }} /></div>
                {c.progress_updates.length > 0 && (
                  <div className="grid-auto">
                    {c.progress_updates.map((p: { id: string; month: string; title: string; title_ru?: string; photo_url: string | null }) => (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 90, borderRadius: 10, background: '#E1E7F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#3D4F78' }}>
                          {p.photo_url ? <img src={p.photo_url} alt={loc(p, 'title', lang)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t('Foto')}
                        </div>
                        <strong style={{ fontSize: 13 }}>{monthYear(p.month, lang)}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>{loc(p, 'title', lang)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <Calculator lang={lang} units={units} priceM2={c.price_m2} maxMonths={c.installment_months} minFirstPct={c.first_payment_pct} />

            {c.nearby.length > 0 && (
              <section className="card section">
                <h2 className="h2">{t('Atrofida')}</h2>
                <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                  {[...c.nearby].sort((a: { distance_m: number }, b: { distance_m: number }) => a.distance_m - b.distance_m).map((n: { id: string; kind: string; distance_m: number }) => (
                    <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <strong>{t(n.kind)}</strong><span className="muted num" style={{ fontSize: 13 }}>{fmtDist(n.distance_m, lang)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {d && (
              <section className="card section" style={{ gap: 18 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--ink)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{d.initials}</div>
                    <div><div className="eyebrow">{t('Quruvchi')}</div><h2 className="h2">{d.name}</h2></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: 'var(--lapis)' }}>{Number(d.rating).toFixed(1)}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{t('Uykor reytingi, 5 dan')}</span>
                  </div>
                </div>
                <div className="stat-grid num">
                  {d.founded_year && <div><span className="v">{d.founded_year}</span><span className="muted" style={{ fontSize: 13 }}>{t('yildan beri ishlaydi')}</span></div>}
                  <div><span className="v">{t('{n} ta', { n: d.delivered_total })}</span><span className="muted" style={{ fontSize: 13 }}>{t('uy qurib topshirgan')}</span></div>
                  <div><span className="v">{t('{n} ta', { n: d.building_now })}</span><span className="muted" style={{ fontSize: 13 }}>{t('majmua qurilmoqda')}</span></div>
                  <div><span className="v">{som(d.sold_units)}</span><span className="muted" style={{ fontSize: 13 }}>{t('xonadon sotilgan')}</span></div>
                  <div><span className="v">{d.delivered_on_time} / {d.delivered_total}</span><span className="muted" style={{ fontSize: 13 }}>{t("uy o'z vaqtida topshirilgan")}</span></div>
                  {d.avg_kadastr_months && <div><span className="v">{t('~{n} oy', { n: d.avg_kadastr_months })}</span><span className="muted" style={{ fontSize: 13 }}>{t("kadastr o'rtacha")}</span></div>}
                </div>
                {history.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{t("Va'da va haqiqat")}</h3>
                    <div className="table-wrap">
                      <table className="t">
                        <thead><tr><th>{t('Majmua')}</th><th>{t("Va'da qilingan")}</th><th>{t('Topshirildi')}</th><th>{t('Natija')}</th></tr></thead>
                        <tbody>
                          {history.map((h) => {
                            const late = delayMonths(h.promised_date, h.delivered_date);
                            return (
                              <tr key={h.slug}>
                                <td>{h.name}</td><td>{quarter(h.promised_date, lang)}</td><td>{quarter(h.delivered_date, lang)}</td>
                                <td>{late > 0 ? <span className="chip warn">{t('{n} oy kechikdi', { n: late })}</span> : <span className="chip ok">{t("O'z vaqtida")}</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <Link href={lp(lang, `/quruvchi/${d.slug}`)} style={{ fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start' }}>{t('Quruvchi profili →')}</Link>
              </section>
            )}
          </div>

          <aside>
            <div className="card section" style={{ boxShadow: '0 6px 20px rgba(20,33,61,0.06)' }}>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>{t('Narxi')}</div>
                <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{t("{n} mln so'mdan", { n: mln(from) })}</div>
              </div>
              {hasShx && (
                <a href="#xonadonlar" className="btn" style={{ minHeight: 48 }}>{t('Xonadon tanlash · {n} ta sotuvda', { n: freeApts.length })}</a>
              )}
              <LeadForm lang={lang} complexId={c.id} />
              <div className="or-line"><span>{t("yoki to'g'ridan-to'g'ri qo'ng'iroq qiling")}</span></div>
              <PhoneReveal lang={lang} kind="quruvchi" id={d.id} hours={d} label={t("Sotuv bo'limi telefoni")} />
              <div className="notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B6B65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto' }}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
                <span>{t("Ariza to'g'ridan-to'g'ri quruvchiga boradi. Makler yo'q, komissiya yo'q.")}</span>
              </div>
            </div>
            <MiniMap lat={c.lat} lng={c.lng} label={c.name} lang={lang} />
          </aside>
        </div>
      </div>
      <Footer lang={lang} />
    </>
  );
}
