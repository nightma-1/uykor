import { T, type Lang } from './i18n';

/** When a poster accepts calls, in Samarkand time. Days are ISO: 1 = Monday ... 7 = Sunday. */
export type CallHours = { call_days: number[]; call_from: string; call_to: string };

export const DAY_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

// Public column lists. Phone numbers are not readable directly: the site asks
// contact_phone() for them, and it answers only inside the owner's call hours.
export const LISTING_COLS = 'id, owner_id, kind, title, city, district, address, lat, lng, rooms, area, floor, floors_total, price, currency, description, contact_name, poster_type, status, verification, reject_reason, views, created_at, updated_at, published_at, call_days, call_from, call_to';
export const MASTER_COLS = 'id, owner_id, name, categories, city, districts, experience_years, price_note, description, avatar_url, status, verification, reject_reason, views, created_at, updated_at, published_at, rating, review_count, call_days, call_from, call_to';
export const MASTER_TABLE_COLS = MASTER_COLS.replace(', rating, review_count', '');
export const DEVELOPER_COLS = 'id, slug, name, initials, city, founded_year, description, description_ru, verified, delivered_total, delivered_on_time, sold_units, avg_kadastr_months, buyer_rating, review_count, docs_open, is_sample, created_at, rating, building_now, call_days, call_from, call_to';

const hm = (s: string) => (s || '').slice(0, 5);

/** "Du–Ju, 09:00–18:00" / "Har kuni, 09:00–21:00". */
export function hoursText(h: CallHours, lang: Lang): string {
  const t = T(lang);
  const d = [...new Set(h.call_days || [])].filter((x) => x >= 1 && x <= 7).sort((a, b) => a - b);
  let days: string;
  if (d.length === 7) days = t('Har kuni');
  else if (d.length === 0) days = '—';
  else {
    // Collapse runs of consecutive days: 1,2,3,4,5,7 -> Du–Ju, Ya
    const parts: string[] = [];
    let s = d[0], p = d[0];
    for (const x of [...d.slice(1), 99]) {
      if (x === p + 1) { p = x; continue; }
      parts.push(s === p ? t(DAY_SHORT[s - 1]) : `${t(DAY_SHORT[s - 1])}–${t(DAY_SHORT[p - 1])}`);
      s = p = x;
    }
    days = parts.join(', ');
  }
  return `${days}, ${hm(h.call_from)}–${hm(h.call_to)}`;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Reads the CallHoursFields inputs. Falls back to every day 09:00–21:00. */
export function readCallHours(f: FormData): CallHours {
  const days = f.getAll('call_days').map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 1 && x <= 7);
  const from = String(f.get('call_from') ?? '');
  const to = String(f.get('call_to') ?? '');
  return {
    call_days: days.length ? [...new Set(days)].sort() : [1, 2, 3, 4, 5, 6, 7],
    call_from: TIME.test(from) ? from : '09:00',
    call_to: TIME.test(to) && to !== from ? to : '21:00',
  };
}
