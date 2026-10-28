import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MasterContact from '@/components/MasterContact';
import FavoriteButton from '@/components/FavoriteButton';
import ReviewForm from '@/components/ReviewForm';
import { Avatar } from '@/components/MastersClient';
import { catLabel, getMaster } from '@/lib/masters';
import { alternates, langFrom, locale, lp, T, type Lang } from '@/lib/i18n';

export const revalidate = 60;

type Params = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = await langFrom(params);
  const { id } = await params;
  const t = T(lang);
  const d = await getMaster(id);
  if (!d) return { title: t('Topilmadi') };
  const m = d.master;
  const cats = m.categories.map((c) => catLabel(c, lang));
  return {
    title: `${m.name}: ${cats.slice(0, 2).join(', ')}`,
    description: `${cats.join(', ')}. ${t(m.city)}${m.districts ? `, ${m.districts}` : ''}.${m.review_count ? ` ${t('Reyting {r}, {n} sharh.', { r: Number(m.rating).toFixed(1), n: m.review_count })}` : ''}`,
    openGraph: m.avatar_url ? { images: [{ url: m.avatar_url }] } : undefined,
    alternates: alternates(lang, `/usta/${id}`),
  };
}

function Stars({ n, lang }: { n: number; lang: Lang }) {
  return <span aria-label={T(lang)('{n} yulduz', { n })} style={{ color: '#E3A008', letterSpacing: 1 }}>{'★'.repeat(n)}<span style={{ color: '#D5DBE5' }}>{'★'.repeat(5 - n)}</span></span>;
}

export default async function MasterPage({ params }: Params) {
  const lang = await langFrom(params);
  const { id } = await params;
  const t = T(lang);
  const cl = (c: string) => catLabel(c, lang);
  const d = await getMaster(id);
  if (!d) notFound();
  const { master: m, photos, reviews } = d;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, c: reviews.filter((r) => r.rating === s).length }));

  return (
    <>
      <Header lang={lang} active="ustalar" />
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <nav aria-label={t("Yo'l")} className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href={lp(lang, '/ustalar')} style={{ textDecoration: 'none' }}>{t('Ustalar')}</Link><span aria-hidden="true">/</span>
          {m.categories[0] && <><Link href={lp(lang, `/ustalar?tur=${m.categories[0]}`)} style={{ textDecoration: 'none' }}>{cl(m.categories[0])}</Link><span aria-hidden="true">/</span></>}
          <span style={{ color: 'var(--ink)' }}>{m.name}</span>
        </nav>

        <div className="two-col">
          <div className="main">
            <section className="card" style={{ padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <Avatar m={m} size={96} />
              <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {m.verification === 'tasdiqlangan' && <span className="chip turq">{t("Tekshirilgan usta: pasport ko'rilgan")}</span>}
                  {m.categories.map((c) => <span key={c} className="chip blue">{cl(c)}</span>)}
                </div>
                <div className="title-row"><h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{m.name}</h1><FavoriteButton lang={lang} type="usta" id={m.id} variant="button" /></div>
                <span className="muted">{[t(m.city), m.districts].filter(Boolean).join(', ')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                {m.review_count > 0 ? (
                  <>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, lineHeight: 1, color: 'var(--lapis)' }}>{Number(m.rating).toFixed(1)}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{t('{n} ta sharh', { n: m.review_count })}</span>
                  </>
                ) : <span className="muted" style={{ fontSize: 14 }}>{t("Hali sharh yo'q")}</span>}
              </div>
            </section>

            <section className="card facts num">
              {m.experience_years != null && <div><span className="eyebrow">{t('Tajriba')}</span><span className="v">{t('{n} yil', { n: m.experience_years })}</span></div>}
              {m.price_note && <div><span className="eyebrow">{t('Narxlar')}</span><span className="v" style={{ fontSize: 17 }}>{m.price_note}</span></div>}
              <div><span className="eyebrow">{t('Ishlaydigan hudud')}</span><span className="v" style={{ fontSize: 17 }}>{m.districts || t(m.city)}</span></div>
            </section>

            {m.description && (
              <section className="card section">
                <h2 className="h2">{t('Usta haqida')}</h2>
                <p style={{ margin: 0, whiteSpace: 'pre-line', maxWidth: 720 }}>{m.description}</p>
              </section>
            )}

            {photos.length > 0 && (
              <section className="card section">
                <h2 className="h2">{t('Bajarilgan ishlar')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {photos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', background: '#E1E7F0' }}>
                      <img src={p.url} alt={t('Bajarilgan ish')} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section id="sharhlar" className="card section">
              <h2 className="h2">{t('Mijozlar sharhlari')}</h2>
              {reviews.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 360 }}>
                  {dist.map(({ s, c }) => (
                    <div key={s} className="num" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ width: 24 }}>{s}★</span>
                      <div className="bar"><span style={{ width: `${(c / reviews.length) * 100}%`, background: '#E3A008' }} /></div>
                      <span className="muted" style={{ width: 24, textAlign: 'right' }}>{c}</span>
                    </div>
                  ))}
                </div>
              )}
              {reviews.length === 0 && <span className="muted">{t("Bu ustaga hali sharh yozilmagan. Birinchi bo'ling.")}</span>}
              {reviews.map((r) => (
                <article key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{r.author_name}</strong>
                    <span className="muted" style={{ fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <Stars n={r.rating} lang={lang} />
                  <p style={{ margin: 0, whiteSpace: 'pre-line', color: 'var(--gray-ink)' }}>{r.body}</p>
                </article>
              ))}
              <ReviewForm lang={lang} masterId={m.id} path={lp(lang, `/usta/${m.id}`)} />
            </section>
          </div>

          <aside>
            <div className="card section" style={{ boxShadow: '0 6px 20px rgba(20,33,61,0.06)' }}>
              <strong style={{ fontSize: 18 }}>{t("Ustaga qo'ng'iroq qiling")}</strong>
              <MasterContact lang={lang} id={m.id} hours={m} />
              <div className="notice">
                <span>{t("To'g'ridan-to'g'ri usta bilan gaplashasiz, vositachi yo'q. Narx va muddatni ish boshlanishidan oldin kelishib oling. Oldindan katta to'lov bermang.")}</span>
              </div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{t("{n} marta ko'rilgan", { n: m.views })}</span>
          </aside>
        </div>
      </div>
      <Footer lang={lang} />
    </>
  );
}
