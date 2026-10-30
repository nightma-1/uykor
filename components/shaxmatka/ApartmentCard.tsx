'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import LeadForm from '@/components/LeadForm';
import FavoriteButton from '@/components/FavoriteButton';
import { useCompare } from '@/lib/compare-client';
import { mln, som } from '@/lib/format';
import { lp, T, type Lang } from '@/lib/i18n';
import {
  aptPrice, COMPASS_UZ, STATUS_COLOR, STATUS_INK, sunHours, windowAzimuths, windowLabels,
  type Apartment, type Block, type FloorPlan,
} from '@/lib/shaxmatka';
import { statusText } from './FloorPlanSvg';

export type CardComplex = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  price_m2: number;
  installment_months: number;
  first_payment_pct: number;
};

type Props = {
  lang: Lang;
  complex: CardComplex;
  block: Block;
  plan: FloorPlan;
  apartment: Apartment;
  showBlock: boolean;
  onWalk?: () => void;
  /** Alohida xonadon sahifasida "Sahifani ochish" havolasi kerak emas. */
  standalone?: boolean;
};

export default function ApartmentCard({ lang, complex, block, plan, apartment: a, showBlock, onWalk, standalone }: Props) {
  const t = T(lang);
  const unit = plan.units.find((u) => u.key === a.unit_key);
  const total = aptPrice(a, complex.price_m2);
  const perM2 = total / a.area;
  const firsts = [...new Set([complex.first_payment_pct, 30, 50].filter((v) => v >= complex.first_payment_pct))].sort((x, y) => x - y);
  const terms = [12, 24, 36, 48, 60].filter((m) => m <= complex.installment_months);
  const [first, setFirst] = useState(firsts.includes(30) ? 30 : firsts[0]);
  const [term, setTerm] = useState(terms[terms.length - 1] ?? 0);
  const [lead, setLead] = useState(false);
  const [copied, setCopied] = useState(false);
  const cmp = useCompare();

  const windows = unit ? windowLabels(unit, block) : [];
  const sun = useMemo(() => {
    if (!unit) return null;
    const az = windowAzimuths(unit, block);
    const now = new Date();
    return {
      today: sunHours(az, complex.lat, complex.lng, new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))),
      winter: sunHours(az, complex.lat, complex.lng, new Date(Date.UTC(now.getFullYear(), 11, 21))),
    };
  }, [unit, block, complex.lat, complex.lng]);

  const path = `/jk/${complex.slug}/xonadon/${a.id}`;
  const url = `https://uykor.uz${lp(lang, path)}`;
  const shareText = t('{name}: {rooms} xonali, {area} m², {floor}-qavat — {price} mln so\'m', { name: complex.name, rooms: a.rooms, area: a.area, floor: a.floor, price: mln(total, 1) });
  const firstSum = (total * first) / 100;
  const monthly = term ? (total - firstSum) / term : 0;
  const selling = a.status === 'sotuvda' || a.status === 'bron';

  async function copy() {
    try {
      if (navigator.share) { await navigator.share({ title: complex.name, text: shareText, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* bekor qilindi */ }
  }

  return (
    <article className="shx-card" aria-labelledby={`apt-${a.id}`}>
      <div className="shx-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 id={`apt-${a.id}`} className="shx-card-title">{t('{n} xonali', { n: a.rooms })}, {a.area} m²</h3>
          <div className="muted" style={{ fontSize: 14 }}>
            {t('Xonadon № {n}', { n: a.number })} · {showBlock ? `${t('{name} blok', { name: block.name })}, ` : ''}{t('{f}-qavat, {n} dan', { f: a.floor, n: block.floors })}
          </div>
        </div>
        <span className="shx-pill" style={{ background: STATUS_COLOR[a.status], color: STATUS_INK[a.status] }}>{t(statusText(a.status))}</span>
      </div>

      <div className="shx-price num">
        <strong>{t("{n} so'm", { n: som(total) })}</strong>
        <span className="muted">{t("1 m² — {n} so'm", { n: som(perM2) })}</span>
      </div>

      <dl className="shx-facts">
        <div><dt>{t('Shift balandligi')}</dt><dd>{plan.ceiling_m} m</dd></div>
        {windows.length > 0 && <div><dt>{t('Oynalar')}</dt><dd>{windows.map((w) => t(COMPASS_UZ[w])).join(', ')}</dd></div>}
        {sun && sun.today.hours > 0 && <div><dt>{t('Bugun quyosh')}</dt><dd>{t('~{n} soat', { n: String(sun.today.hours).replace('.', ',') })} <span className="muted">({sun.today.from}–{sun.today.to})</span></dd></div>}
        {sun && <div><dt>{t('Qishda (21-dekabr)')}</dt><dd>{sun.winter.hours > 0 ? t('~{n} soat', { n: String(sun.winter.hours).replace('.', ',') }) : t("to'g'ri quyosh tushmaydi")}</dd></div>}
      </dl>

      {unit?.rooms_detail && unit.rooms_detail.length > 0 && (
        <div className="shx-rooms">
          {unit.rooms_detail.map((r, i) => (
            <span key={i}><span className="muted">{t(r.name)}</span> <span className="num">{r.area} m²</span></span>
          ))}
        </div>
      )}

      {selling && terms.length > 0 && (
        <div className="shx-pay">
          <div className="seg" role="group" aria-label={t("Boshlang'ich to'lov")}>
            {firsts.map((f) => <button key={f} type="button" aria-pressed={f === first} onClick={() => setFirst(f)}>{f}%</button>)}
          </div>
          <div className="seg" role="group" aria-label={t('Muddat')}>
            {terms.map((m) => <button key={m} type="button" aria-pressed={m === term} onClick={() => setTerm(m)}>{t('{n} oy', { n: m })}</button>)}
          </div>
          <div className="shx-pay-res num">
            <div><span className="muted">{t("Boshlang'ich")}</span><strong>{t("{n} mln so'm", { n: mln(firstSum, 1) })}</strong></div>
            <div><span className="muted">{t('Har oy')}</span><strong style={{ color: 'var(--lapis)' }}>{t("{n} so'm", { n: som(Math.round(monthly / 1000) * 1000) })}</strong></div>
          </div>
        </div>
      )}

      <div className="shx-actions">
        {selling && !lead && <button type="button" className="btn" onClick={() => setLead(true)}>{a.status === 'bron' ? t("Bron tushsa xabar bering") : t('Ariza qoldirish')}</button>}
        {onWalk && <button type="button" className="btn ghost" onClick={onWalk}>{t('Ichiga kirish (3D)')}</button>}
      </div>
      {lead && <LeadForm lang={lang} complexId={complex.id} apartmentId={a.id} idPrefix={`lead-${a.id.slice(0, 6)}`} />}
      {selling && <span className="muted" style={{ fontSize: 12 }}>{t("Ariza to'g'ridan-to'g'ri quruvchiga boradi. Makler yo'q, komissiya yo'q.")}</span>}

      <div className="shx-tools">
        <FavoriteButton lang={lang} type="xonadon" id={a.id} variant="button" />
        <button type="button" className="btn ghost small" aria-pressed={cmp.has(a.id)} onClick={() => cmp.toggle(a.id)}>
          {cmp.has(a.id) ? t('Taqqoslashda ✓') : t('Taqqoslash')}
        </button>
        <a className="btn ghost small" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener">Telegram</a>
        <button type="button" className="btn ghost small" onClick={copy}>{copied ? t('Nusxa olindi') : t('Havola')}</button>
        {!standalone && <Link className="btn ghost small" href={lp(lang, path)}>{t('Alohida sahifa')}</Link>}
      </div>
    </article>
  );
}
