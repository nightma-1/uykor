'use client';

import { centroid, corridorRect, STATUS_COLOR, STATUS_INK, type Apartment, type Block, type FloorPlan } from '@/lib/shaxmatka';
import type { TFn } from '@/lib/i18n';

type Props = {
  t: TFn;
  block: Block;
  plan: FloorPlan;
  apartments: Apartment[];
  selected?: string | null;
  isDimmed?: (a: Apartment) => boolean;
  onPick?: (a: Apartment) => void;
  /** Faqat bitta xonadonni ko'rsatish (xonadon sahifasi). */
  focusKey?: string;
  walker?: { x: number; y: number; heading: number } | null;
  compact?: boolean;
};

/** Qavat planirovkasi: xonadonlar holat rangida, xonalar ichki chiziqlar bilan. */
export default function FloorPlanSvg({ t, block, plan, apartments, selected, isDimmed, onPick, focusKey, walker, compact }: Props) {
  const W = block.width_m;
  const D = block.depth_m;
  const pad = Math.max(W, D) * 0.07;
  const cor = corridorRect(plan.units, W, D);
  const fs = Math.max(W, D) / (compact ? 30 : 36);
  const byKey = new Map(apartments.map((a) => [a.unit_key, a]));
  const north = -block.rotation_deg;

  return (
    <svg viewBox={`${-pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`} className="shx-plan" role="img" aria-label={t('Qavat planirovkasi')}>
      <rect x={-pad / 2} y={-pad / 2} width={W + pad} height={D + pad} rx={pad / 3} fill="var(--card)" stroke="var(--line-strong)" strokeWidth={fs * 0.08} />
      {plan.image_url && <image href={plan.image_url} x={0} y={0} width={W} height={D} preserveAspectRatio="none" opacity={0.9} />}
      {cor && !plan.image_url && (
        <g>
          <rect x={cor[0]} y={cor[1]} width={cor[2] - cor[0]} height={cor[3] - cor[1]} fill="#E3E6EB" />
          <text x={W / 2} y={(cor[1] + cor[3]) / 2} fontSize={fs * 0.8} textAnchor="middle" dominantBaseline="central" fill="var(--muted)">{t("Yo'lak · lift · zina")}</text>
        </g>
      )}
      {plan.units.map((u) => {
        const a = byKey.get(u.key);
        if (focusKey && u.key !== focusKey) {
          return <polygon key={u.key} points={u.poly.map((p) => p.join(',')).join(' ')} fill="#EEF0F4" stroke="#FFFFFF" strokeWidth={fs * 0.12} />;
        }
        const st = a?.status ?? 'yopiq';
        const sel = a && a.id === selected;
        const dim = a && isDimmed ? isDimmed(a) : false;
        const [cx, cy] = centroid(u.poly);
        const fill = sel ? 'var(--lapis)' : STATUS_COLOR[st];
        const ink = sel ? '#FFFFFF' : STATUS_INK[st];
        const label = a ? `№ ${a.number}, ${a.rooms} ${t('xonali')}, ${a.area} m², ${t(statusText(st))}` : '';
        return (
          <g
            key={u.key}
            className={`shx-unit${onPick && a ? ' clickable' : ''}${sel ? ' sel' : ''}`}
            opacity={dim ? 0.3 : 1}
            role={onPick && a ? 'button' : undefined}
            tabIndex={onPick && a ? 0 : undefined}
            aria-label={label || undefined}
            aria-pressed={onPick && a ? !!sel : undefined}
            onClick={() => a && onPick?.(a)}
            onKeyDown={(e) => { if (a && onPick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(a); } }}
          >
            <polygon points={u.poly.map((p) => p.join(',')).join(' ')} fill={fill} fillOpacity={plan.image_url ? 0.55 : 0.92} stroke={sel ? 'var(--ink)' : '#FFFFFF'} strokeWidth={fs * (sel ? 0.22 : 0.14)} strokeLinejoin="round" />
            {!plan.image_url && (u.rooms_detail || []).map((r, i) => (
              <polygon key={i} points={r.poly.map((p) => p.join(',')).join(' ')} fill="none" stroke={ink} strokeOpacity={0.35} strokeWidth={fs * 0.05} />
            ))}
            {!plan.image_url && focusKey && (u.rooms_detail || []).map((r, i) => {
              const [rx, ry] = centroid(r.poly);
              return (
                <text key={`t${i}`} x={rx} y={ry} fontSize={fs * 0.62} textAnchor="middle" fill={ink}>
                  <tspan x={rx} dy={-fs * 0.2}>{t(r.name)}</tspan>
                  <tspan x={rx} dy={fs * 0.75} opacity={0.8}>{r.area} m²</tspan>
                </text>
              );
            })}
            {a && !focusKey && (
              <text x={cx} y={cy} textAnchor="middle" fill={ink} style={{ pointerEvents: 'none' }}>
                <tspan x={cx} dy={-fs * 0.55} fontSize={fs * 0.95} fontWeight={700}>{a.rooms} {t('xona')}</tspan>
                <tspan x={cx} dy={fs * 1.2} fontSize={fs * 1.05} fontWeight={700}>{a.area} m²</tspan>
                <tspan x={cx} dy={fs * 1.1} fontSize={fs * 0.7} opacity={0.85}>№ {a.number}</tspan>
              </text>
            )}
          </g>
        );
      })}
      {walker && (
        <g transform={`translate(${walker.x} ${walker.y}) rotate(${(walker.heading * 180) / Math.PI})`} style={{ pointerEvents: 'none' }}>
          <path d={`M0 0 L${fs * 2.4} ${-fs * 1.1} A${fs * 2.6} ${fs * 2.6} 0 0 1 ${fs * 2.4} ${fs * 1.1} Z`} fill="var(--lapis)" opacity={0.3} />
          <circle r={fs * 0.55} fill="var(--lapis)" stroke="#FFFFFF" strokeWidth={fs * 0.15} />
        </g>
      )}
      <g transform={`translate(${W + pad * 0.5} ${pad * 0.2}) rotate(${north})`} aria-hidden="true">
        <path d={`M0 ${-fs * 1.1} L${fs * 0.5} ${fs * 0.6} L0 ${fs * 0.25} L${-fs * 0.5} ${fs * 0.6} Z`} fill="var(--ink)" />
        <text y={-fs * 1.4} fontSize={fs * 0.7} textAnchor="middle" fill="var(--ink)" transform={`rotate(${-north} 0 ${-fs * 1.6})`}>{t('Sh.')}</text>
      </g>
    </svg>
  );
}

export function statusText(s: string) {
  return s === 'sotuvda' ? 'Sotuvda' : s === 'bron' ? 'Bron' : s === 'sotilgan' ? 'Sotilgan' : 'Sotuvda emas';
}
