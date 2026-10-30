'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompare } from '@/lib/compare-client';
import { mln, quarter, som } from '@/lib/format';
import { lp, T, type Lang } from '@/lib/i18n';
import { aptPrice, COMPASS_UZ, sunHours, windowAzimuths, windowLabels, type Apartment, type Block, type FloorPlan } from '@/lib/shaxmatka';
import FloorPlanSvg, { statusText } from './FloorPlanSvg';
import '@/app/shaxmatka.css';

type Item = {
  apartment: Apartment;
  block: Block;
  plan: FloorPlan;
  complex: { id: string; slug: string; name: string; lat: number; lng: number; price_m2: number; installment_months: number; first_payment_pct: number; status: string; promised_date: string | null; kadastr_status: string };
};

export default function CompareView({ lang, items }: { lang: Lang; items: Item[] }) {
  const t = T(lang);
  const cmp = useCompare();
  const router = useRouter();

  // Havola orqali kelgan ro'yxatni brauzerga ham yozamiz.
  useEffect(() => {
    if (!items.length) return;
    items.forEach((i) => { if (!cmp.has(i.apartment.id)) cmp.toggle(i.apartment.id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items.length) {
    return (
      <div className="card section" style={{ alignItems: 'flex-start' }}>
        <span className="muted">{t("Taqqoslash uchun xonadon tanlanmagan. Majmua sahifasida xonadon kartasidagi \"Taqqoslash\" tugmasini bosing.")}</span>
        <Link className="btn small" href={lp(lang, '/')}>{t('Novostroykalar')}</Link>
      </div>
    );
  }

  const winter = new Date(Date.UTC(new Date().getFullYear(), 11, 21));
  const rows = items.map((i) => {
    const a = i.apartment;
    const unit = i.plan.units.find((u) => u.key === a.unit_key);
    const price = aptPrice(a, Number(i.complex.price_m2));
    const term = [60, 48, 36, 24, 12].find((m) => m <= i.complex.installment_months) ?? 0;
    const firstPct = Math.max(30, i.complex.first_payment_pct);
    return {
      i, a, unit, price, perM2: price / a.area,
      monthly: term ? (price * (1 - firstPct / 100)) / term : 0, term, firstPct,
      windows: unit ? windowLabels(unit, i.block) : [],
      sun: unit ? sunHours(windowAzimuths(unit, i.block), Number(i.complex.lat), Number(i.complex.lng), winter).hours : 0,
    };
  });
  const best = {
    price: Math.min(...rows.map((r) => r.price)),
    perM2: Math.min(...rows.map((r) => r.perM2)),
    area: Math.max(...rows.map((r) => r.a.area)),
    sun: Math.max(...rows.map((r) => r.sun)),
  };
  const remove = (id: string) => {
    cmp.remove(id);
    const rest = items.map((x) => x.apartment.id).filter((x) => x !== id);
    router.replace(`${lp(lang, '/taqqoslash')}${rest.length ? `?x=${rest.join(',')}` : ''}`);
  };

  const line = (label: string, cell: (r: (typeof rows)[number]) => React.ReactNode) => (
    <tr><th scope="row">{label}</th>{rows.map((r) => <td key={r.a.id}>{cell(r)}</td>)}</tr>
  );

  return (
    <div className="card table-wrap" style={{ padding: 8 }}>
      <table className="cmp-table num">
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">{t('Xonadon')}</span></th>
            {rows.map((r) => (
              <td key={r.a.id} style={{ verticalAlign: 'top' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FloorPlanSvg t={t} block={r.i.block} plan={r.i.plan} apartments={[r.a]} focusKey={r.a.unit_key} compact />
                  <Link href={lp(lang, `/jk/${r.i.complex.slug}/xonadon/${r.a.id}`)} style={{ fontWeight: 700 }}>{r.i.complex.name}, № {r.a.number}</Link>
                  <button type="button" className="btn ghost small" onClick={() => remove(r.a.id)}>{t('Olib tashlash')}</button>
                </div>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {line(t('Narxi'), (r) => <span className={r.price === best.price && rows.length > 1 ? 'cmp-best' : ''}>{t("{n} mln so'm", { n: mln(r.price, 1) })}</span>)}
          {line(t('1 m² narxi'), (r) => <span className={r.perM2 === best.perM2 && rows.length > 1 ? 'cmp-best' : ''}>{t("{n} so'm", { n: som(r.perM2) })}</span>)}
          {line(t('Xonalar'), (r) => t('{n} xonali', { n: r.a.rooms }))}
          {line(t('Maydon'), (r) => <span className={r.a.area === best.area && rows.length > 1 ? 'cmp-best' : ''}>{r.a.area} m²</span>)}
          {line(t('Qavat'), (r) => t('{f}-qavat, {n} dan', { f: r.a.floor, n: r.i.block.floors }))}
          {line(t('Oynalar'), (r) => r.windows.map((w) => t(COMPASS_UZ[w])).join(', ') || '—')}
          {line(t('Qishda quyosh'), (r) => <span className={r.sun === best.sun && r.sun > 0 && rows.length > 1 ? 'cmp-best' : ''}>{r.sun > 0 ? t('~{n} soat', { n: String(r.sun).replace('.', ',') }) : '—'}</span>)}
          {line(t('Shift balandligi'), (r) => `${r.i.plan.ceiling_m} m`)}
          {line(t("Oylik to'lov"), (r) => (r.term ? <>{t("{n} so'm", { n: som(Math.round(r.monthly / 1000) * 1000) })}<div className="muted" style={{ fontSize: 12 }}>{t("{p}% boshlang'ich, {m} oy", { p: r.firstPct, m: r.term })}</div></> : t("Yo'q")))}
          {line(t('Holati'), (r) => t(statusText(r.a.status)))}
          {line(t('Topshirish'), (r) => (r.i.complex.status === 'topshirilgan' ? t('Topshirilgan') : quarter(r.i.complex.promised_date, lang)))}
          {line(t('Kadastr'), (r) => (r.i.complex.kadastr_status === 'bor' ? t('Chiqqan') : t('Jarayonda')))}
        </tbody>
      </table>
    </div>
  );
}
