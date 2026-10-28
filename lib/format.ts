import type { Lang } from './i18n';

export function som(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function mln(n: number, digits = 0): string {
  const v = n / 1_000_000;
  return v.toFixed(digits).replace('.', ',');
}

export function quarter(date: string | null, lang: Lang = 'uz'): string {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  const q = Math.floor(d.getMonth() / 3) + 1;
  const roman = ['I', 'II', 'III', 'IV'][q - 1];
  return lang === 'ru' ? `${roman} квартал ${d.getFullYear()}` : `${roman} chorak ${d.getFullYear()}`;
}

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export function monthYear(date: string, lang: Lang = 'uz'): string {
  const d = new Date(date + 'T00:00:00');
  return `${(lang === 'ru' ? MONTHS_RU : MONTHS)[d.getMonth()]} ${d.getFullYear()}`;
}

export function delayMonths(promised: string | null, delivered: string | null): number {
  if (!promised || !delivered) return 0;
  const p = new Date(promised + 'T00:00:00');
  const d = new Date(delivered + 'T00:00:00');
  const months = (d.getFullYear() - p.getFullYear()) * 12 + (d.getMonth() - p.getMonth());
  return Math.max(0, months);
}

export function minPrice(c: { price_m2: number; area_min: number | null; unit_types?: { price: number | null; area: number }[] }): number {
  const prices = (c.unit_types || []).map((u) => u.price ?? u.area * c.price_m2);
  if (prices.length) return Math.min(...prices);
  return (c.area_min ?? 40) * c.price_m2;
}

export function dueLabel(c: { status: string; promised_date: string | null }, lang: Lang = 'uz'): string {
  return c.status === 'topshirilgan' ? (lang === 'ru' ? 'Сдан' : 'Topshirilgan') : quarter(c.promised_date, lang);
}
