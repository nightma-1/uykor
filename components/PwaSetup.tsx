'use client';

import { useEffect, useState } from 'react';
import { T, type Lang } from '@/lib/i18n';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = 'uykor-install-hidden';
const HIDE_DAYS = 30;

function hiddenRecently() {
  try {
    const v = Number(localStorage.getItem(KEY) || 0);
    return Date.now() - v < HIDE_DAYS * 86_400_000;
  } catch { return false; }
}

/** Registers the service worker and, on phones, offers to install Uykor as an app. */
export default function PwaSetup({ lang, offer = true }: { lang: Lang; offer?: boolean }) {
  const t = T(lang);
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ });
    }
    if (!offer) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    if (standalone || !mobile || hiddenRecently()) return;

    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|Telegram|Instagram|FBAN/.test(ua);
    setIos(isIos);
    // Give people a moment with the site before asking.
    const timer = window.setTimeout(() => setShow(true), 15000);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.clearTimeout(timer); };
  }, [offer]);

  function hide() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
    setShow(false);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    setPrompt(null);
    hide();
  }

  if (!show || (!prompt && !ios)) return null;

  return (
    <div className="install-bar" role="dialog" aria-label={t("Uykor ilovasini o'rnatish")}>
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong>{t("Uykor'ni telefoningizga o'rnating")}</strong>
        <span className="muted" style={{ fontSize: 13 }}>
          {prompt ? t("Bosh ekrandan bir bosishda ochiladi, xotirani deyarli egallamaydi.") : t("Pastdagi \"Ulashish\" tugmasini bosing, keyin \"Bosh ekranga qo'shish\" ni tanlang.")}
        </span>
      </div>
      {prompt && <button type="button" className="btn small" onClick={install}>{t("O'rnatish")}</button>}
      <button type="button" className="install-x" onClick={hide} aria-label={t('Yopish')}>×</button>
    </div>
  );
}
