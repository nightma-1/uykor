'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ListingKind, ListingWithPhotos } from '@/lib/listings';
import { KINDS, priceShort, priceText, roomsText } from '@/lib/listings';
import { lp, T, type Lang } from '@/lib/i18n';
import FavoriteButton from './FavoriteButton';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <div style={{ height: '100%', background: '#EEF1EC' }} /> });

const ROOMS = ['Hammasi', '1', '2', '3', '4+'];

export default function ListingsClient({ lang, kind, listings }: { lang: Lang; kind: ListingKind; listings: ListingWithPhotos[] }) {
  const t = T(lang);
  const k = KINDS[kind];
  const [rooms, setRooms] = useState('Hammasi');
  const [maxPrice, setMaxPrice] = useState('');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>(kind === 'sotuv' ? 'USD' : 'UZS');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => {
    const max = parseFloat(maxPrice.replace(/\s/g, '').replace(',', '.'));
    const needle = q.trim().toLowerCase();
    const out = listings.filter((l) => {
      if (rooms !== 'Hammasi') {
        if (!l.rooms) return false;
        if (rooms === '4+' ? l.rooms < 4 : l.rooms !== Number(rooms)) return false;
      }
      if (!isNaN(max)) {
        const limit = currency === 'UZS' ? max * 1_000_000 : max;
        if (l.currency !== currency || l.price > limit) return false;
      }
      if (needle && !`${l.title} ${l.district} ${l.address}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === 'cheap') out.sort((a, b) => (a.currency === b.currency ? a.price - b.price : a.currency === 'UZS' ? -1 : 1));
    return out;
  }, [listings, rooms, maxPrice, currency, q, sort]);

  const points = useMemo(
    () => list.filter((l) => l.lat != null && l.lng != null).map((l) => ({ id: l.id, lat: l.lat as number, lng: l.lng as number, label: priceShort(l, lang), title: l.title })),
    [list, lang],
  );
  const sel = list.find((l) => l.id === selected);
  const newHref = `/kabinet/elon/yangi?tur=${kind}`;

  return (
    <>
      <section className="wrap" style={{ paddingTop: 28, paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{t(k.h1)}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 16, maxWidth: 640 }}>{t(k.lead)}</p>
          </div>
          <Link href={newHref} className="btn">{t("+ E'lon joylash")}</Link>
        </div>
        <form className="card filters" onSubmit={(e) => e.preventDefault()} aria-label={t('Filtrlar')}>
          <div className="field wide">
            <span className="label" id="l-rooms">{t('Xonalar')}</span>
            <div className="seg" role="group" aria-labelledby="l-rooms">
              {ROOMS.map((r) => <button key={r} type="button" aria-pressed={rooms === r} onClick={() => setRooms(r)}>{r === 'Hammasi' ? t('Hammasi') : r}</button>)}
            </div>
          </div>
          <div className="field">
            <label htmlFor="l-price">{currency === 'UZS' ? t("Narx gacha (mln so'm)") : t('Narx gacha ($)')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input id="l-price" className="input" inputMode="decimal" placeholder={currency === 'UZS' ? t('masalan 5') : t('masalan 60000')} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              <select className="input" style={{ width: 84 }} aria-label={t('Valyuta')} value={currency} onChange={(e) => setCurrency(e.target.value as 'UZS' | 'USD')}>
                <option value="UZS">{t("so'm")}</option>
                <option value="USD">$</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="l-q">{t("Hudud yoki ko'cha")}</label>
            <input id="l-q" className="input" placeholder={t('masalan Sattepo')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </form>
      </section>

      <main className="wrap home-main">
        <div className="list-col">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{t("{n} ta e'lon", { n: list.length })}</span>
            <Link href={`/kabinet/sevimlilar?${new URLSearchParams({ tur: kind, ...(rooms !== 'Hammasi' ? { xona: rooms === '4+' ? '4' : rooms } : {}), ...(maxPrice ? { narx: maxPrice, valyuta: currency } : {}), ...(q.trim() ? { hudud: q.trim() } : {}) })}`} className="notify-link">🔔 {t("Yangi e'lonlar haqida xabar berish")}</Link>
            <label htmlFor="l-sort" className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              {t('Saralash')}
              <select id="l-sort" className="input" style={{ height: 36, width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="new">{t('Yangilari')}</option>
                <option value="cheap">{t('Arzonroq')}</option>
              </select>
            </label>
          </div>

          {listings.length === 0 && (
            <div className="card section" style={{ alignItems: 'flex-start' }}>
              <strong>{t("Hozircha e'lon yo'q.")}</strong>
              <span className="muted">{kind === 'sotuv' ? t("Uyingizni maklersiz soting: birinchi e'lonni siz joylang.") : t("Uyingizni maklersiz ijaraga bering: birinchi e'lonni siz joylang.")}</span>
              <Link href={newHref} className="btn small">{t("E'lon joylash")}</Link>
            </div>
          )}
          {listings.length > 0 && list.length === 0 && (
            <div className="card section"><span className="muted">{t("Bu filtrlarga mos e'lon topilmadi.")}</span></div>
          )}

          {list.map((l) => {
            const on = l.id === selected;
            const photo = l.listing_photos[0]?.url;
            const href = lp(lang, `/elon/${l.id}`);
            return (
              <article key={l.id} className={`card jk-card${on ? ' on' : ''}`} onClick={() => setSelected(l.id)}>
                <FavoriteButton lang={lang} type="elon" id={l.id} />
                <div className="jk-thumb" style={{ background: '#DDE5EF' }}>
                  {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="muted" style={{ alignSelf: 'center', fontSize: 12 }}>{t("Rasm yo'q")}</span>}
                </div>
                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.25 }}>
                    <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{l.title}</Link>
                  </h2>
                  <span className="muted" style={{ fontSize: 13 }}>{[l.district, roomsText(l, lang)].filter(Boolean).join(' · ')}</span>
                  <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{priceText(l, lang)}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {l.verification === 'tasdiqlangan' && <span className="chip turq">{l.poster_type === 'quruvchi' ? t('Quruvchidan, tekshirilgan') : t('Egasi tekshirilgan')}</span>}
                    <span className="chip gray">{t('Komissiyasiz')}</span>
                  </div>
                  <Link href={href} style={{ alignSelf: 'flex-end', fontWeight: 600, fontSize: 14, textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>{t('Batafsil →')}</Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="map-col">
          <div className="map-box" style={{ position: 'relative' }}>
            <MapView points={points} selectedId={selected} onSelect={setSelected} lang={lang} />
            {sel && (
              <div className="card" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 500, padding: '12px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', boxShadow: '0 6px 20px rgba(20,33,61,0.16)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <strong>{sel.title}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{[sel.district, roomsText(sel, lang)].filter(Boolean).join(' · ')}</span>
                </div>
                <strong className="num">{priceText(sel, lang)}</strong>
                <Link href={lp(lang, `/elon/${sel.id}`)} className="btn small">{t('Ochish')}</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
