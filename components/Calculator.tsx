'use client';

import { useState } from 'react';
import type { UnitType } from '@/lib/types';
import { som, mln } from '@/lib/format';
import { T, type Lang } from '@/lib/i18n';

type Props = { lang: Lang; units: UnitType[]; priceM2: number; maxMonths: number; minFirstPct: number };

export default function Calculator({ lang, units, priceM2, maxMonths, minFirstPct }: Props) {
  const t = T(lang);
  const [unit, setUnit] = useState(units[Math.min(1, units.length - 1)]?.id ?? '');
  const firsts = [...new Set([minFirstPct, 30, 50].filter((v) => v >= minFirstPct))].sort((a, b) => a - b);
  const terms = [12, 24, 36, 48, 60].filter((m) => m <= maxMonths);
  const [first, setFirst] = useState(firsts.includes(30) ? 30 : firsts[0]);
  const [term, setTerm] = useState(terms[terms.length - 1] ?? 0);

  if (!units.length) return null;
  const u = units.find((x) => x.id === unit) ?? units[0];
  const total = u.price ?? u.area * priceM2;
  const firstSum = (total * first) / 100;
  const monthly = term ? (total - firstSum) / term : 0;
  const sum = (n: number) => t("{n} so'm", { n: som(n) });

  return (
    <section className="card section">
      <div>
        <h2 className="h2">{t("Bo'lib to'lash kalkulyatori")}</h2>
        <span className="muted" style={{ fontSize: 14 }}>{t("Xonadon, boshlang'ich to'lov va muddatni tanlang.")}</span>
      </div>
      <div className="field">
        <span className="label" id="calc-unit">{t('Xonadon')}</span>
        <div className="grid-auto" role="group" aria-labelledby="calc-unit">
          {units.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={x.id === u.id}
              onClick={() => setUnit(x.id)}
              className="unit-btn"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: x.id === u.id ? 'var(--lapis)' : 'var(--card)', color: x.id === u.id ? '#FFFFFF' : 'var(--ink)',
                border: `1px solid ${x.id === u.id ? 'var(--lapis)' : 'var(--line-strong)'}`,
              }}
            >
              <strong>{t('{n} xonali', { n: x.rooms })}</strong>
              <span className="num" style={{ fontSize: 12, opacity: 0.85 }}>{x.area} m² · {mln(x.price ?? x.area * priceM2)} {t('mln')}</span>
            </button>
          ))}
        </div>
      </div>
      {terms.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="field" style={{ flex: '1 1 240px' }}>
              <span className="label" id="calc-first">{t("Boshlang'ich to'lov")}</span>
              <div className="seg" role="group" aria-labelledby="calc-first">
                {firsts.map((f) => <button key={f} type="button" aria-pressed={f === first} onClick={() => setFirst(f)}>{f}%</button>)}
              </div>
            </div>
            <div className="field" style={{ flex: '1 1 240px' }}>
              <span className="label" id="calc-term">{t('Muddat')}</span>
              <div className="seg" role="group" aria-labelledby="calc-term">
                {terms.map((m) => <button key={m} type="button" aria-pressed={m === term} onClick={() => setTerm(m)}>{t('{n} oy', { n: m })}</button>)}
              </div>
            </div>
          </div>
          <div className="calc-result num">
            <div><div className="muted" style={{ fontSize: 12 }}>{t('Umumiy narx')}</div><strong>{sum(total)}</strong></div>
            <div><div className="muted" style={{ fontSize: 12 }}>{t("Boshlang'ich to'lov")}</div><strong>{sum(firstSum)}</strong></div>
            <div><div className="muted" style={{ fontSize: 12 }}>{t("Oylik to'lov")}</div><strong style={{ fontSize: 20, color: 'var(--lapis)' }}>{sum(monthly)}</strong></div>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{t('Quruvchi rassrochkasi foizsiz deb hisoblangan. Aniq shartlarni quruvchi bilan tasdiqlang.')}</span>
        </>
      ) : (
        <div className="calc-result num"><div><div className="muted" style={{ fontSize: 12 }}>{t('Narxi')}</div><strong>{sum(total)}</strong></div></div>
      )}
    </section>
  );
}
