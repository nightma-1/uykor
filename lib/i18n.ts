import { RU as RU1 } from './i18n-ru';
import { RU2 } from './i18n-ru2';
import { RU3 } from './i18n-ru3';
import { RU4 } from './i18n-ru4';

const RU: Record<string, string> = { ...RU1, ...RU2, ...RU3, ...RU4 };

export type Lang = 'uz' | 'ru';
export const LANGS: Lang[] = ['uz', 'ru'];
export const SITE = 'https://uykor.uz';

export function isLang(x: unknown): x is Lang {
  return x === 'uz' || x === 'ru';
}

/** Public URL for a path in the given language: Uzbek has no prefix, Russian lives under /ru. */
export function lp(lang: Lang, path: string): string {
  if (lang === 'uz') return path;
  return path === '/' ? '/ru' : `/ru${path}`;
}

/** Strips the /ru prefix from a browser path. */
export function basePath(path: string): string {
  if (path === '/ru') return '/';
  return path.startsWith('/ru/') ? path.slice(3) : path;
}

export type TFn = (s: string, v?: Record<string, string | number>) => string;

/** Uzbek text is the key; Russian falls back to Uzbek when a phrase has no translation. */
export function T(lang: Lang): TFn {
  return (s, v) => {
    let out = lang === 'ru' ? RU[s] ?? s : s;
    if (v) for (const [k, val] of Object.entries(v)) out = out.split(`{${k}}`).join(String(val));
    return out;
  };
}

/** Picks the Russian variant of a stored field when it is filled in. */
export function loc<O extends Record<string, unknown>>(o: O, field: string, lang: Lang): string {
  const ru = o[`${field}_ru`];
  if (lang === 'ru' && typeof ru === 'string' && ru.trim()) return ru;
  return String(o[field] ?? '');
}

export const locale = (lang: Lang) => (lang === 'ru' ? 'ru-RU' : 'uz-UZ');

/** canonical + hreflang alternates for a public path. */
export function alternates(lang: Lang, path: string) {
  return {
    canonical: `${SITE}${lp(lang, path)}`,
    languages: { uz: `${SITE}${path}`, ru: `${SITE}${lp('ru', path)}`, 'x-default': `${SITE}${path}` },
  };
}

export async function langFrom(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  return isLang(lang) ? lang : 'uz';
}

/** Translates a server message like "Yetishmayapti: telefon raqam, pasport rasmi" piece by piece. */
export function tMsg(t: TFn, msg: string): string {
  const i = msg.indexOf(': ');
  if (i < 0) return t(msg);
  return `${t(msg.slice(0, i))}: ${msg.slice(i + 2).split(', ').map((p) => t(p)).join(', ')}`;
}
