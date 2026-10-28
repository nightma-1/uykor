'use client';

import { usePathname, useRouter } from 'next/navigation';
import { basePath, lp, type Lang } from '@/lib/i18n';

const APP = /^\/(admin|kabinet|kirish)(\/|$)/;

export default function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname() || '/';
  const router = useRouter();

  function go(to: Lang) {
    if (to === lang) return;
    try { document.cookie = `lang=${to}; path=/; max-age=31536000; samesite=lax`; } catch { /* cookie blocked */ }
    if (APP.test(path)) {
      router.refresh();
      return;
    }
    const q = window.location.search;
    window.location.href = lp(to, basePath(path)) + q;
  }

  return (
    <div className="lang-switch" role="group" aria-label="Til / Язык">
      <button type="button" aria-pressed={lang === 'uz'} onClick={() => go('uz')}>UZ</button>
      <button type="button" aria-pressed={lang === 'ru'} onClick={() => go('ru')}>RU</button>
    </div>
  );
}
