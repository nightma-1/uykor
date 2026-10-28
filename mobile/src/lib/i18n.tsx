import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { RU } from './ru';

export type Lang = 'uz' | 'ru';
export type TFn = (s: string, vars?: Record<string, string | number>) => string;

const KEY = 'uykor.lang';

export function T(lang: Lang): TFn {
  return (s, vars) => {
    let out = lang === 'ru' ? RU[s] ?? s : s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  };
}

/** Text in the user's language, falling back to Uzbek when there is no Russian version. */
export function loc<T extends Record<string, unknown>>(row: T, field: string, lang: Lang): string {
  const ru = row[`${field}_ru`];
  if (lang === 'ru' && typeof ru === 'string' && ru.trim()) return ru;
  return String(row[field] ?? '');
}

type Ctx = { lang: Lang; t: TFn; setLang: (l: Lang) => void };
const LangCtx = createContext<Ctx>({ lang: 'uz', t: T('uz'), setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const device = getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'uz';
  const [lang, setLangState] = useState<Lang>(device);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === 'uz' || v === 'ru') setLangState(v); }).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => ({
    lang,
    t: T(lang),
    setLang: (l) => { setLangState(l); AsyncStorage.setItem(KEY, l).catch(() => {}); },
  }), [lang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
