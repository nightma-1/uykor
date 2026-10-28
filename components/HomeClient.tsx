'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ComplexWithDev } from '@/lib/types';
import { dueLabel, minPrice, mln } from '@/lib/format';
import { lp, T, type Lang } from '@/lib/i18n';
import FavoriteButton from './FavoriteButton';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <div style={{ height: '100%', background: '#EAEFE8' }} /> });

const ROOMS = ['Hammasi', '1', '2', '3', '4+'];

export default function HomeClient({ lang, complexes }: { lang: Lang; complexes: ComplexWithDev[] }) {
  const t = T(lang);
  const [rooms, setRooms] = useState('Hammasi');
  const [maxM2, setMaxM2] = useState('');
  const [minInst, setMinInst] = useState('0');
  const [kadastr, setKadastr] = useState('any');
  const [due, setDue] = useState('any');
  const [sort, setSort] = useState('rating');
  const [selected, setSelected] = useState<string | null>(null);

  const years = useMemo(() => {
    const s = new Set<string>();
    complexes.forEach((c) => c.status === 'qurilmoqda' && c.promised_date && s.add(c.promised_date.slice(0, 4)));
    return [...s].sort();
  }, [complexes]);

  const list = useMemo(() => {
    const max = parseFloat(maxM2.replace(',', '.'));
    const out = complexes.filter((c) => {
      if (rooms !== 'Hammasi') {
        const want = rooms === '4+' ? 4 : Number(rooms);
        if (!c.unit_types.some((u) => (rooms === '4+' ? u.rooms >= 4 : u.rooms === want))) return false;
      }
      if (!isNaN(max) && c.price_m2 / 1_000_000 > max) return false;
      if (c.installment_months < Number(minInst)) return false;
      if (kadastr === 'bor' && c.kadastr_status !== 'bor') return false;
      if (due === 'done' && c.status !== 'topshirilgan') return false;
      if (due !== 'any' && due !== 'done' && !(c.status === 'qurilmoqda' && c.promised_date?.startsWith(due))) return false;
      return true;
    });
    if (sort === 'cheap') out.sort((a, b) => minPrice(a) - minPrice(b));
    else if (sort === 'soon') out.sort((a, b) => (a.status === 'topshirilgan' ? '0' : a.promised_date || '9').localeCompare(b.status === 'topshirilgan' ? '0' : b.promised_date || '9'));
    else out.sort((a, b) => b.developer.rating - a.developer.rating);
    return out;
  }, [complexes, rooms, maxM2, minInst, kadastr, due, sort]);

  const points = useMemo(
    () => list.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, label: `${mln(c.price_m2, 1)} ${t('mln')}`, title: c.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, lang],
  );
  const sel = list.find((c) => c.id === selected);

  function reset() {
    setRooms('Hammasi'); setMaxM2(''); setMinInst('0'); setKadastr('any'); setDue('any');
  }

  function roomsLabel(c: ComplexWithDev) {
    if (!c.unit_types.length) return '';
    const r = c.unit_types.map((u) => u.rooms);
    const lo = Math.min(...r), hi = Math.max(...r);
    return lo === hi ? t('{n} xonali', { n: lo }) : t('{n} xonali', { n: `${lo}–${hi}` });
  }

  return (
    <>
      <section className="wrap" style={{ paddingTop: 28, paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{t('Samarqanddagi yangi uylar xaritada')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 16, maxWidth: 640 }}>
            {t("Narx, bo'lib to'lash muddati, kadastr holati va topshirish sanasini solishtiring. Har bir quruvchining reytingi faktlarga asoslangan.")}
          </p>
        </div>

        <form className="card filters" onSubmit={(e) => e.preventDefault()} aria-label={t('Filtrlar')}>
          <div className="field wide">
            <span className="label" id="rooms-l">{t('Xonalar')}</span>
            <div className="seg" role="group" aria-labelledby="rooms-l">
              {ROOMS.map((r) => (
                <button key={r} type="button" aria-pressed={rooms === r} onClick={() => setRooms(r)}>{r === 'Hammasi' ? t('Hammasi') : r}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-price">{t("1 m² narxi, mln so'm gacha")}</label>
            <input id="f-price" className="input" inputMode="decimal" placeholder={t('masalan 10')} value={maxM2} onChange={(e) => setMaxM2(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-ras">{t("Bo'lib to'lash")}</label>
            <select id="f-ras" className="input" value={minInst} onChange={(e) => setMinInst(e.target.value)}>
              <option value="0">{t("Farqi yo'q")}</option>
              <option value="24">{t("{n} oy va ko'proq", { n: 24 })}</option>
              <option value="36">{t("{n} oy va ko'proq", { n: 36 })}</option>
              <option value="48">{t("{n} oy va ko'proq", { n: 48 })}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-kad">{t('Kadastr')}</label>
            <select id="f-kad" className="input" value={kadastr} onChange={(e) => setKadastr(e.target.value)}>
              <option value="any">{t("Farqi yo'q")}</option>
              <option value="bor">{t('Faqat chiqqan')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-due">{t('Topshirish')}</label>
            <select id="f-due" className="input" value={due} onChange={(e) => setDue(e.target.value)}>
              <option value="any">{t('Istalgan')}</option>
              <option value="done">{t('Topshirilgan')}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </form>
      </section>

      <main className="wrap home-main">
        <div className="list-col">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{t('{n} ta majmua topildi', { n: list.length })}</span>
            <Link href={`/kabinet/sevimlilar?${new URLSearchParams({ tur: 'majmua', ...(maxM2 ? { narx: maxM2 } : {}) })}`} className="notify-link">🔔 {t('Yangi majmualar haqida xabar berish')}</Link>
            <label htmlFor="f-sort" className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              {t('Saralash')}
              <select id="f-sort" className="input" style={{ height: 36, width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="rating">{t('Quruvchi reytingi')}</option>
                <option value="cheap">{t('Arzonroq')}</option>
                <option value="soon">{t('Tezroq topshiriladi')}</option>
              </select>
            </label>
          </div>

          {list.length === 0 && (
            <div className="card section" style={{ alignItems: 'flex-start' }}>
              <strong>{t("Bu filtrlarga mos majmua yo'q.")}</strong>
              <span className="muted">{t("Filtrlarni yumshatib ko'ring.")}</span>
              <button className="btn ghost small" type="button" onClick={reset}>{t('Filtrlarni tozalash')}</button>
            </div>
          )}

          {list.map((c) => {
            const on = c.id === selected;
            const href = lp(lang, `/jk/${c.slug}`);
            return (
              <article key={c.id} className={`card jk-card${on ? ' on' : ''}`} onClick={() => setSelected(c.id)}>
                <FavoriteButton lang={lang} type="majmua" id={c.id} />
                <div className="jk-thumb">
                  {c.cover_url ? <img src={c.cover_url} alt="" /> : <BuildingArt />}
                </div>
                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.25 }}>
                    <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{c.name}</Link>
                  </h2>
                  <span className="muted" style={{ fontSize: 13 }}>{c.district} · {roomsLabel(c)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{c.developer.name}</span>
                    <span className="rating num">★ {c.developer.rating.toFixed(1)}</span>
                  </div>
                  <div className="num" style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{t("{n} mln so'mdan", { n: mln(minPrice(c)) })}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{mln(c.price_m2, 1)} {t('mln/m²')}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.installment_months > 0 && <span className="chip blue">{t("{n} oygacha bo'lib to'lash", { n: c.installment_months })}</span>}
                    {c.kadastr_status === 'bor' ? <span className="chip ok">{t('Kadastr chiqqan')}</span> : <span className="chip warn">{t('Kadastr jarayonda')}</span>}
                    <span className="chip gray">{dueLabel(c, lang)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }} className="muted">
                    <div className="bar"><span style={{ width: `${c.progress}%` }} /></div>
                    <span className="num" style={{ flex: '0 0 auto' }}>{t('Qurilish {n}%', { n: c.progress })}</span>
                  </div>
                  <Link href={href} style={{ alignSelf: 'flex-end', fontWeight: 600, fontSize: 14, textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                    {t('Batafsil →')}
                  </Link>
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
                  <strong>{sel.name}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{sel.developer.name} · {t('reyting {n}', { n: sel.developer.rating.toFixed(1) })} · {dueLabel(sel, lang)}</span>
                </div>
                <strong className="num">{t("{n} mln so'mdan", { n: mln(minPrice(sel)) })}</strong>
                <Link href={lp(lang, `/jk/${sel.slug}`)} className="btn small">{t('Majmuani ochish')}</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function BuildingArt() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      <rect x="14" y="30" width="30" height="66" fill="#FFFFFF" opacity="0.85" />
      <rect x="50" y="12" width="32" height="84" fill="#FFFFFF" opacity="0.95" />
      <g fill="#9AAAC8">
        <rect x="20" y="38" width="6" height="6" /><rect x="32" y="38" width="6" height="6" />
        <rect x="20" y="52" width="6" height="6" /><rect x="32" y="52" width="6" height="6" />
        <rect x="56" y="20" width="7" height="7" /><rect x="69" y="20" width="7" height="7" />
        <rect x="56" y="34" width="7" height="7" /><rect x="69" y="34" width="7" height="7" />
        <rect x="56" y="48" width="7" height="7" /><rect x="69" y="48" width="7" height="7" />
      </g>
    </svg>
  );
}
