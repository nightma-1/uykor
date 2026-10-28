'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import '@/app/masters.css';
import { CATEGORIES, catLabel, initials, ratingText, type MasterStats } from '@/lib/masters';
import { lp, T, type Lang } from '@/lib/i18n';
import FavoriteButton from './FavoriteButton';

export default function MastersClient({ lang, masters }: { lang: Lang; masters: MasterStats[] }) {
  const t = T(lang);
  const cl = (c: string) => catLabel(c, lang);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tur');
    if (t && CATEGORIES[t]) setCat(t);
  }, []);

  function pick(c: string) {
    setCat(c);
    const url = new URL(window.location.href);
    if (c) url.searchParams.set('tur', c); else url.searchParams.delete('tur');
    window.history.replaceState(null, '', url);
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    masters.forEach((x) => x.categories.forEach((c) => { m[c] = (m[c] || 0) + 1; }));
    return m;
  }, [masters]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = masters.filter((m) => {
      if (cat && !m.categories.includes(cat)) return false;
      if (needle && !`${m.name} ${m.districts} ${m.description} ${m.categories.map(cl).join(' ')}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === 'new') out.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    if (sort === 'exp') out.sort((a, b) => (b.experience_years ?? -1) - (a.experience_years ?? -1));
    return out;
  }, [masters, cat, q, sort]);

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 34px)' }}>{t('Samarqanddagi ustalar')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 16, maxWidth: 640 }}>{t("Ta'mir, santexnika, elektrika va boshqa ishlar uchun usta toping. Sharhlarni haqiqiy mijozlar yozadi, ustalar pasport bilan tekshiriladi.")}</p>
        </div>
        <Link href="/kabinet/usta" className="btn">{t("Usta sifatida qo'shilish")}</Link>
      </div>

      <div className="cat-row" role="group" aria-label={t("Yo'nalish")}>
        <button type="button" aria-pressed={cat === ''} onClick={() => pick('')}>{t('Hammasi')} <span className="n">{masters.length}</span></button>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <button key={k} type="button" aria-pressed={cat === k} onClick={() => pick(k)}>
            {t(v)}{counts[k] ? <span className="n">{counts[k]}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ flex: '1 1 260px', maxWidth: 420 }} aria-label={t('Qidirish')} placeholder={t('Ism, hudud yoki ish turi')} value={q} onChange={(e) => setQ(e.target.value)} />
        <span style={{ fontWeight: 600 }}>{t('{n} ta usta', { n: list.length })}</span>
        <label htmlFor="m-sort" className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginLeft: 'auto' }}>
          {t('Saralash')}
          <select id="m-sort" className="input" style={{ height: 36, width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="rating">{t('Reyting')}</option>
            <option value="exp">{t('Tajriba')}</option>
            <option value="new">{t('Yangilari')}</option>
          </select>
        </label>
      </div>

      {masters.length === 0 && (
        <div className="card section" style={{ alignItems: 'flex-start' }}>
          <strong>{t("Hozircha ustalar qo'shilmagan.")}</strong>
          <span className="muted">{t("Usta bo'lsangiz, profilingizni bepul oching: mijozlar sizga to'g'ridan-to'g'ri qo'ng'iroq qiladi.")}</span>
          <Link href="/kabinet/usta" className="btn small">{t('Profil ochish')}</Link>
        </div>
      )}
      {masters.length > 0 && list.length === 0 && <div className="card section"><span className="muted">{t("Bu yo'nalishda hozircha usta yo'q.")}</span></div>}

      <div className="master-grid">
        {list.map((m) => (
          <Link key={m.id} href={lp(lang, `/usta/${m.id}`)} className="card master-card">
            <FavoriteButton lang={lang} type="usta" id={m.id} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar m={m} size={56} />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <strong style={{ fontSize: 16 }}>{m.name}</strong>
                <span className={m.review_count ? 'rating num' : 'muted'} style={{ fontSize: 13, alignSelf: 'flex-start' }}>{ratingText(m, lang)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {m.verification === 'tasdiqlangan' && <span className="chip turq">{t('Tekshirilgan usta')}</span>}
              {m.categories.slice(0, 3).map((c) => <span key={c} className="chip blue">{cl(c)}</span>)}
              {m.categories.length > 3 && <span className="chip gray">+{m.categories.length - 3}</span>}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {[m.experience_years ? t('{n} yil tajriba', { n: m.experience_years }) : '', m.districts].filter(Boolean).join(' · ') || t(m.city)}
            </span>
            {m.price_note && <span className="num" style={{ fontWeight: 700 }}>{m.price_note}</span>}
          </Link>
        ))}
      </div>
    </main>
  );
}

export function Avatar({ m, size }: { m: Pick<MasterStats, 'name' | 'avatar_url'>; size: number }) {
  if (m.avatar_url) return <img src={m.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }} />;
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: 'var(--lapis-soft)', color: 'var(--lapis)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.34, flex: '0 0 auto' }}>
      {initials(m.name)}
    </div>
  );
}
