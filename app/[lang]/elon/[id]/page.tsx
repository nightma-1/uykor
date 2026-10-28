import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MiniMap from '@/components/MiniMap';
import ListingContact from '@/components/ListingContact';
import FavoriteButton from '@/components/FavoriteButton';
import { getListing, KINDS, priceShort, priceText, roomsText } from '@/lib/listings';
import { alternates, langFrom, locale, lp, T } from '@/lib/i18n';

export const revalidate = 60;

type Params = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = await langFrom(params);
  const { id } = await params;
  const t = T(lang);
  const l = await getListing(id);
  if (!l) return { title: t('Topilmadi') };
  return {
    title: l.title,
    description: `${priceText(l, lang)} · ${roomsText(l, lang)} · ${l.district}. ${t('Egasidan, maklersiz.')}`,
    openGraph: l.listing_photos[0] ? { images: [{ url: l.listing_photos[0].url }] } : undefined,
    alternates: alternates(lang, `/elon/${id}`),
  };
}

export default async function ListingPage({ params }: Params) {
  const lang = await langFrom(params);
  const { id } = await params;
  const t = T(lang);
  const l = await getListing(id);
  if (!l) notFound();
  const k = KINDS[l.kind];
  const photos = l.listing_photos;
  const facts = [
    l.rooms ? { k: t('Xonalar'), v: `${l.rooms}` } : null,
    l.area ? { k: t('Maydon'), v: `${l.area} m²` } : null,
    l.floor ? { k: t('Qavat'), v: l.floors_total ? `${l.floor} / ${l.floors_total}` : `${l.floor}` } : null,
    { k: t('Joylangan'), v: new Date(l.published_at || l.created_at).toLocaleDateString(locale(lang), { day: 'numeric', month: 'long' }) },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <>
      <Header lang={lang} active={l.kind} />
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <nav aria-label={t("Yo'l")} className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href={lp(lang, `/${l.kind}`)} style={{ textDecoration: 'none' }}>{t(k.title)}</Link><span aria-hidden="true">/</span>
          <span>{t(l.city)}</span><span aria-hidden="true">/</span><span style={{ color: 'var(--ink)' }}>{l.title}</span>
        </nav>

        {photos.length === 0 ? (
          <div className="gallery single"><div>{t("Rasm qo'shilmagan")}</div></div>
        ) : (
          <div className={`gallery${photos.length < 5 ? ' single' : ''}`}>
            {(photos.length < 5 ? photos.slice(0, 1) : photos.slice(0, 5)).map((p, i) => (
              <div key={p.id} style={{ position: 'relative' }}>
                <img src={p.url} alt={i === 0 ? l.title : ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 0 && photos.length > 1 && <span className="chip gray" style={{ position: 'absolute', right: 10, bottom: 10 }}>{t('{n} ta rasm', { n: photos.length })}</span>}
              </div>
            ))}
          </div>
        )}
        {photos.length > 1 && photos.length < 5 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {photos.slice(1).map((p) => <img key={p.id} src={p.url} alt="" style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 10, flex: '0 0 auto' }} />)}
          </div>
        )}

        <div className="two-col">
          <div className="main">
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {l.verification === 'tasdiqlangan' && <span className="chip turq">{l.poster_type === 'quruvchi' ? t('Quruvchidan, hujjatlari tekshirilgan') : t('Egasi hujjat bilan tekshirilgan')}</span>}
                <span className="chip gray">{t('Komissiyasiz')}</span>
              </div>
              <div className="title-row"><h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{l.title}</h1><FavoriteButton lang={lang} type="elon" id={l.id} variant="button" /></div>
              <p className="muted" style={{ margin: 0 }}>{[t(l.city), l.district, l.address].filter(Boolean).join(', ')}</p>
            </section>

            <section className="card facts num">
              <div><span className="eyebrow">{t('Narx')}</span><span className="v">{priceText(l, lang)}</span></div>
              {facts.map((f) => <div key={f.k}><span className="eyebrow">{f.k}</span><span className="v">{f.v}</span></div>)}
            </section>

            {l.description && (
              <section className="card section">
                <h2 className="h2">{t('Tavsif')}</h2>
                <p style={{ margin: 0, whiteSpace: 'pre-line', maxWidth: 720 }}>{l.description}</p>
              </section>
            )}

            {l.lat != null && l.lng != null && <MiniMap lat={l.lat} lng={l.lng} label={priceShort(l, lang)} lang={lang} />}
          </div>

          <aside>
            <div className="card section" style={{ boxShadow: '0 6px 20px rgba(20,33,61,0.06)' }}>
              <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{priceText(l, lang)}</div>
              <ListingContact lang={lang} id={l.id} hours={l} name={l.contact_name} />
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{t("{n} marta ko'rilgan", { n: l.views })}</span>
          </aside>
        </div>
      </div>
      <Footer lang={lang} />
    </>
  );
}
