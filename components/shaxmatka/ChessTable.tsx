'use client';

import { mln } from '@/lib/format';
import type { TFn } from '@/lib/i18n';
import { aptPrice, STATUS_COLOR, STATUS_INK, type Apartment, type Block } from '@/lib/shaxmatka';
import { statusText } from './FloorPlanSvg';

type Props = {
  t: TFn;
  block: Block;
  apartments: Apartment[]; // shu blokdagilar
  priceM2: number;
  selApt: string | null;
  selFloor: number | null;
  isDimmed: (a: Apartment) => boolean;
  onPick: (a: Apartment) => void;
};

/** Oddiy shaxmatka: qatorlar — qavatlar (yuqoridan pastga), kataklar — xonadonlar, rangi — holati. */
export default function ChessTable({ t, block, apartments, priceM2, selApt, selFloor, isDimmed, onPick }: Props) {
  const floors: number[] = [];
  for (let f = block.floors; f >= 1; f--) floors.push(f);
  const byFloor = new Map<number, Apartment[]>();
  for (const a of apartments) {
    const l = byFloor.get(a.floor) ?? [];
    l.push(a);
    byFloor.set(a.floor, l);
  }
  byFloor.forEach((l) => l.sort((x, y) => x.ord - y.ord));
  const cols = Math.max(1, ...[...byFloor.values()].map((l) => l.length));

  return (
    <div className="shx-chess" role="region" aria-label={t('Shaxmatka')} tabIndex={0}>
      <table>
        <tbody>
          {floors.map((f) => {
            const list = byFloor.get(f) ?? [];
            const commercial = f <= block.commercial_floors;
            return (
              <tr key={f} className={selFloor === f ? 'cur' : ''}>
                <th scope="row">{f}</th>
                {list.length === 0 ? (
                  <td colSpan={cols} className="shx-chess-empty">{commercial ? t("Do'konlar") : t("ma'lumot yo'q")}</td>
                ) : (
                  list.map((a) => {
                    const sold = a.status === 'sotilgan' || a.status === 'yopiq';
                    const dim = isDimmed(a);
                    return (
                      <td key={a.id}>
                        <button
                          type="button"
                          aria-pressed={a.id === selApt}
                          className={dim ? 'dim' : ''}
                          style={{ background: STATUS_COLOR[a.status], color: STATUS_INK[a.status] }}
                          onClick={() => onPick(a)}
                          aria-label={`№ ${a.number}, ${t('{n} xonali', { n: a.rooms })}, ${a.area} m², ${t(statusText(a.status))}`}
                        >
                          <span className="r">{a.rooms}{t('x')}</span>
                          <span className="a">{a.area}</span>
                          <span className="p">{sold ? t(statusText(a.status)) : mln(aptPrice(a, priceM2))}</span>
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
