import type { Lang } from './i18n';
import type { Complex, Listing, UnitType } from './types';

export function som(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function mln(n: number, digits = 0): string {
  return (n / 1_000_000).toFixed(digits).replace('.', ',');
}

export function quarter(date: string | null, lang: Lang = 'uz'): string {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  const roman = ['I', 'II', 'III', 'IV'][Math.floor(d.getMonth() / 3)];
  return lang === 'ru' ? `${roman} кв. ${d.getFullYear()}` : `${roman} chorak ${d.getFullYear()}`;
}

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export function monthYear(date: string, lang: Lang = 'uz'): string {
  const d = new Date(date.slice(0, 10) + 'T00:00:00');
  return `${(lang === 'ru' ? MONTHS_RU : MONTHS)[d.getMonth()]} ${d.getFullYear()}`;
}

export function dueLabel(c: Pick<Complex, 'status' | 'promised_date'>, lang: Lang = 'uz'): string {
  if (c.status === 'topshirilgan') return lang === 'ru' ? 'Сдан' : 'Topshirilgan';
  return c.promised_date ? quarter(c.promised_date, lang) : lang === 'ru' ? 'Срок не указан' : "Muddat ko'rsatilmagan";
}

export function delayMonths(promised: string | null, delivered: string | null): number {
  if (!promised || !delivered) return 0;
  const p = new Date(promised), d = new Date(delivered);
  return Math.max(0, (d.getFullYear() - p.getFullYear()) * 12 + d.getMonth() - p.getMonth());
}

export function unitPrice(u: UnitType, priceM2: number) {
  return u.price ?? u.area * priceM2;
}

export function minPrice(c: Pick<Complex, 'price_m2' | 'area_min'> & { unit_types?: UnitType[] }): number {
  const prices = (c.unit_types || []).map((u) => unitPrice(u, c.price_m2));
  if (prices.length) return Math.min(...prices);
  return (c.area_min || 40) * c.price_m2;
}

const PERIOD: Record<Listing['kind'], { uz: string; ru: string }> = {
  ijara: { uz: 'oyiga', ru: 'в месяц' },
  kunlik: { uz: 'kuniga', ru: 'в сутки' },
  sotuv: { uz: '', ru: '' },
};

export function priceText(l: Pick<Listing, 'price' | 'currency' | 'kind'>, lang: Lang = 'uz'): string {
  const base = l.currency === 'USD' ? `$${som(l.price)}` : `${som(l.price)} ${lang === 'ru' ? 'сум' : "so'm"}`;
  const per = PERIOD[l.kind][lang];
  return per ? `${base} ${per}` : base;
}

export function priceShort(l: Pick<Listing, 'price' | 'currency'>, lang: Lang = 'uz'): string {
  if (l.currency === 'USD') return l.price >= 1000 ? `$${(l.price / 1000).toFixed(l.price >= 100000 ? 0 : 1).replace('.0', '')}k` : `$${l.price}`;
  if (l.price >= 1_000_000) return `${(l.price / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} ${lang === 'ru' ? 'млн' : 'mln'}`;
  return `${Math.round(l.price / 1000)} ${lang === 'ru' ? 'тыс' : 'ming'}`;
}

export function roomsText(l: Pick<Listing, 'rooms' | 'area' | 'floor' | 'floors_total'>, lang: Lang = 'uz'): string {
  const parts: string[] = [];
  if (l.rooms) parts.push(lang === 'ru' ? `${l.rooms}-комн.` : `${l.rooms} xonali`);
  if (l.area) parts.push(`${l.area} m²`);
  if (l.floor) {
    const f = l.floors_total ? `${l.floor}/${l.floors_total}` : `${l.floor}`;
    parts.push(lang === 'ru' ? `${f} этаж` : `${f}-qavat`);
  }
  return parts.join(' · ');
}

export function cleanPhone(p: string) {
  return p.replace(/[^\d+]/g, '');
}

const MONTHS_GEN_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const MONTHS_GEN_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** "21 oktabr" / "21 октября" (+ year when asked). Device locales often lack Uzbek, so months are spelled here. */
export function dayMonth(iso: string, lang: Lang = 'uz', withYear = false): string {
  const d = new Date(iso);
  const m = (lang === 'ru' ? MONTHS_GEN_RU : MONTHS_GEN_UZ)[d.getMonth()];
  return `${d.getDate()} ${m}${withYear ? ` ${d.getFullYear()}` : ''}`;
}
