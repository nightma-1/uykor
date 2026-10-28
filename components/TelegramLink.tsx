'use client';

import { useEffect, useRef, useState } from 'react';
import { sbBrowser } from '@/lib/favorites-client';
import { T, type Lang } from '@/lib/i18n';

const BOT = 'UykorBot';
const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tg-auth`;

function newNonce() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Connects @UykorBot to the signed-in account so reminders reach Telegram. */
export default function TelegramLink({ lang }: { lang: Lang }) {
  const t = T(lang);
  const [state, setState] = useState<'idle' | 'waiting' | 'done' | 'band' | 'error'>('idle');
  const [link, setLink] = useState('');
  const nonce = useRef('');
  const busy = useRef(false);
  const started = useRef(0);

  async function poll() {
    if (!nonce.current || busy.current) return;
    if (Date.now() - started.current > 10 * 60_000) { nonce.current = ''; setState('error'); return; }
    busy.current = true;
    try {
      const { data: { session } } = await sbBrowser.auth.getSession();
      if (!session) { nonce.current = ''; setState('error'); return; }
      const r = await fetch(FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'link', nonce: nonce.current }),
      });
      const j = await r.json();
      if (j.status === 'linked') { nonce.current = ''; setState('done'); window.location.reload(); }
      else if (j.status === 'band') { nonce.current = ''; setState('band'); }
      else if (j.status !== 'pending') { nonce.current = ''; setState('error'); }
    } catch { /* try again on the next tick */ } finally { busy.current = false; }
  }

  useEffect(() => {
    if (state !== 'waiting') return;
    const id = window.setInterval(poll, 2000);
    const onVis = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function start() {
    nonce.current = newNonce();
    started.current = Date.now();
    const url = `https://t.me/${BOT}?start=login_${nonce.current}`;
    setLink(url);
    setState('waiting');
    window.open(url, '_blank', 'noopener');
  }

  if (state === 'waiting') {
    return (
      <div className="notice" role="status" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <strong>{t("Telegram'da \"Tasdiqlash\" tugmasini bosing")}</strong>
        <span>{t('Bot ochilmadimi?')} <a href={link} target="_blank" rel="noopener">{t("Telegram'ni ochish")}</a></span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <button type="button" className="btn tg-btn small" onClick={start} disabled={state === 'done'}>{t("Telegram'ni ulash")}</button>
      {state === 'band' && <span className="error">{t("Bu Telegram boshqa Uykor hisobiga ulangan. O'sha hisobga \"Telegram orqali kirish\" bilan kiring.")}</span>}
      {state === 'error' && <span className="error">{t("Ulab bo'lmadi. Qaytadan urinib ko'ring.")}</span>}
    </div>
  );
}
