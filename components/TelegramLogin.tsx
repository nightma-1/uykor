'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { T, type Lang } from '@/lib/i18n';

const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const BOT = 'UykorBot';
const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tg-auth`;
const LIMIT_MS = 10 * 60_000;

function newNonce() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Login through the Telegram bot: open the bot, confirm there, come back. */
export default function TelegramLogin({ lang, next }: { lang: Lang; next: string }) {
  const t = T(lang);
  const [state, setState] = useState<'idle' | 'waiting' | 'done' | 'expired' | 'error'>('idle');
  const [link, setLink] = useState('');
  const nonce = useRef('');
  const started = useRef(0);
  const busy = useRef(false);

  async function poll() {
    if (!nonce.current || busy.current) return;
    if (Date.now() - started.current > LIMIT_MS) { setState('expired'); nonce.current = ''; return; }
    busy.current = true;
    try {
      const r = await fetch(FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: JSON.stringify({ action: 'check', nonce: nonce.current }),
      });
      const j = await r.json();
      if (j.status === 'ok' && j.token_hash) {
        nonce.current = '';
        const { error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'email' });
        if (error) { setState('error'); return; }
        setState('done');
        window.location.href = next;
      } else if (j.status === 'error') {
        nonce.current = '';
        setState('error');
      }
    } catch { /* network blip: try again on the next tick */ } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    if (state !== 'waiting') return;
    const id = window.setInterval(poll, 2000);
    const onVis = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {state === 'waiting' ? (
        <div className="notice" role="status" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <strong>{t("Telegram'da \"Tasdiqlash\" tugmasini bosing")}</strong>
          <span>{t('Bot ochilmadimi?')} <a href={link} target="_blank" rel="noopener">{t("Telegram'ni ochish")}</a></span>
          <span className="muted" style={{ fontSize: 13 }}>{t("Tasdiqlaganingizdan so'ng shu sahifaga qayting, kirish avtomatik bo'ladi.")}</span>
          <button type="button" className="btn ghost small" onClick={() => { nonce.current = ''; setState('idle'); }}>{t('Bekor qilish')}</button>
        </div>
      ) : (
        <button type="button" className="btn tg-btn" onClick={start} disabled={state === 'done'} style={{ minHeight: 48 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13 1.5 11.5c-1-.3-1.1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z" /></svg>
          {state === 'done' ? t('Kirilmoqda…') : t('Telegram orqali kirish')}
        </button>
      )}
      {state === 'expired' && <span className="error">{t("Vaqt tugadi. Qaytadan urinib ko'ring.")}</span>}
      {state === 'error' && <span className="error">{t("Kirib bo'lmadi. Qaytadan urinib ko'ring.")}</span>}
    </div>
  );
}
