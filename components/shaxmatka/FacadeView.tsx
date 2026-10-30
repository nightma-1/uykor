'use client';

import { useState } from 'react';
import '@/app/shaxmatka.css';
import { STATUS_COLOR, type Apartment, type Block } from '@/lib/shaxmatka';
import type { TFn } from '@/lib/i18n';

type Props = {
  t: TFn;
  block: Block;
  apartments: Apartment[];
  selFloor: number | null;
  isDimmed: (a: Apartment) => boolean;
  onPick: (floor: number) => void;
};

function floorInfo(apartments: Apartment[], f: number, isDimmed: (a: Apartment) => boolean) {
  const list = apartments.filter((a) => a.floor === f);
  const free = list.filter((a) => a.status === 'sotuvda' && !isDimmed(a)).length;
  return { total: list.length, free };
}

const heat = (free: number, total: number) => (!total ? 'transparent' : free >= 2 ? STATUS_COLOR.sotuvda : free === 1 ? STATUS_COLOR.bron : '#8E979C');

/** Fasad: quruvchi rasmi ustida bosiladigan qavat chiziqlari yoki chizilgan bino. */
export default function FacadeView({ t, block, apartments, selFloor, isDimmed, onPick }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const floors = Array.from({ length: block.floors }, (_, i) => block.floors - i);
  const label = (f: number) => {
    const { free, total } = floorInfo(apartments, f, isDimmed);
    if (f <= block.commercial_floors) return t("{n}-qavat · do'konlar", { n: f });
    return `${t('{n}-qavat', { n: f })} · ${total ? t('{n} ta sotuvda', { n: free }) : t("ma'lumot yo'q")}`;
  };

  if (block.facade_url) {
    const top = block.facade_top;
    const h = (block.facade_bottom - block.facade_top) / block.floors;
    return (
      <div className="shx-facade">
        <div className="shx-facade-img">
        <img src={block.facade_url} alt={t('{name} blok fasadi', { name: block.name })} />
        {floors.map((f, i) => {
          const com = f <= block.commercial_floors;
          const { free, total } = floorInfo(apartments, f, isDimmed);
          const on = hover === f || selFloor === f;
          return (
            <button
              key={f}
              type="button"
              className={`shx-band${on ? ' on' : ''}`}
              disabled={com || !total}
              aria-pressed={selFloor === f}
              aria-label={label(f)}
              title={label(f)}
              style={{ top: `${top + i * h}%`, height: `${h}%`, ['--heat' as string]: heat(free, total) }}
              onMouseEnter={() => setHover(f)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(f)}
              onBlur={() => setHover(null)}
              onClick={() => onPick(f)}
            >
              <span>{f}</span>
            </button>
          );
        })}
        </div>
        {hover && <div className="shx-facade-tip">{label(hover)}</div>}
      </div>
    );
  }

  // Rasm bo'lmasa — bino siluetini o'zimiz chizamiz.
  const bays = Math.max(4, Math.min(14, Math.round(block.width_m / 3.3)));
  const fw = 44 * bays, fh = 34, roof = 18, ground = 14;
  const H = block.floors * fh + roof + ground;
  return (
    <div className="shx-facade drawn">
      <svg viewBox={`-30 -6 ${fw + 60} ${H + 12}`} role="group" aria-label={t('{name} blok fasadi', { name: block.name })}>
        <rect x={-30} y={H - ground} width={fw + 60} height={ground + 6} fill="#CFD8C4" />
        <rect x={-6} y={0} width={fw + 12} height={roof} rx={3} fill="#B9B4AA" />
        {floors.map((f, i) => {
          const y = roof + i * fh;
          const com = f <= block.commercial_floors;
          const { free, total } = floorInfo(apartments, f, isDimmed);
          const on = hover === f || selFloor === f;
          const clickable = !com && total > 0;
          return (
            <g
              key={f}
              className={`shx-floor${clickable ? ' clickable' : ''}${on ? ' on' : ''}`}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={label(f)}
              aria-pressed={clickable ? selFloor === f : undefined}
              onMouseEnter={() => setHover(f)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(f)}
              onBlur={() => setHover(null)}
              onClick={() => clickable && onPick(f)}
              onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(f); } }}
            >
              <title>{label(f)}</title>
              <rect x={0} y={y} width={fw} height={fh} fill={com ? '#A9A398' : block.color} />
              {Array.from({ length: bays }, (_, k) => (
                <rect key={k} x={k * 44 + (com ? 4 : 11)} y={y + (com ? 4 : 7)} width={com ? 36 : 22} height={com ? fh - 8 : 19} rx={1.5} fill={com ? '#4F6B83' : '#3D5A73'} opacity={0.9} />
              ))}
              {!com && <rect x={0} y={y} width={fw} height={fh} fill={on ? 'var(--lapis)' : heat(free, total)} opacity={on ? 0.55 : total ? 0.28 : 0} />}
              <line x1={0} x2={fw} y1={y + fh} y2={y + fh} stroke="#FFFFFF" strokeOpacity={0.6} />
              <text x={-10} y={y + fh / 2} fontSize={12} textAnchor="end" dominantBaseline="central" fill="var(--muted)" fontWeight={on ? 700 : 500}>{f}</text>
              {!com && total > 0 && <text x={fw + 10} y={y + fh / 2} fontSize={11} dominantBaseline="central" fill={free ? 'var(--ok-ink)' : 'var(--muted)'}>{free}</text>}
            </g>
          );
        })}
      </svg>
      {hover && <div className="shx-facade-tip">{label(hover)}</div>}
    </div>
  );
}
