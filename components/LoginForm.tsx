'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Mark, Wordmark } from '@/components/Logo';
import LangSwitch from '@/components/LangSwitch';
import TelegramLogin from '@/components/TelegramLogin';
import { T, type Lang } from '@/lib/i18n';

const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function LoginForm({ lang }: { lang: Lang }) {
  const t = T(lang);
  const [mode, setMode] = useState<'kirish' | 'royxat'>('kirish');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState('/kabinet');

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('keyin');
    if (k && k.startsWith('/') && !k.startsWith('//')) setNext(k);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) { setMsg({ ok: false, text: t("Parol kamida 8 ta belgidan iborat bo'lsin.") }); return; }
    setBusy(true);
    if (mode === 'kirish') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        setMsg({ ok: false, text: error.message.includes('confirm') ? t('Avval pochtangizga kelgan xatdagi havolani bosib, emailni tasdiqlang.') : t("Email yoki parol noto'g'ri.") });
        return;
      }
      window.location.href = next;
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/kirish` } });
      setBusy(false);
      if (error) { setMsg({ ok: false, text: `${t("Ro'yxatdan o'tib bo'lmadi")}: ${error.message}` }); return; }
      if (data.session) { window.location.href = next; return; }
      setMsg({ ok: true, text: t('Pochtangizga tasdiqlash xati yuborildi. Havolani bosing, keyin shu yerda kiring.') });
      setMode('kirish');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} className="card section" style={{ width: '100%', maxWidth: 420, gap: 16, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><Link href={lang === 'ru' ? '/ru' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--ink)' }}><Mark /><Wordmark /></Link><LangSwitch lang={lang} /></div>
        <TelegramLogin lang={lang} next={next} />
        <div className="or-line"><span>{t('yoki email bilan')}</span></div>
        <div className="seg" role="group" aria-label={t("Kirish yoki ro'yxatdan o'tish")}>
          <button type="button" aria-pressed={mode === 'kirish'} onClick={() => setMode('kirish')}>{t('Kirish')}</button>
          <button type="button" aria-pressed={mode === 'royxat'} onClick={() => setMode('royxat')}>{t("Ro'yxatdan o'tish")}</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t("E'lon joylash va ularni boshqarish uchun hisob kerak. Saytdagi uylarni ko'rish uchun kirish shart emas.")}</p>
        <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">{t('Parol')}</label><input id="password" className="input" type="password" autoComplete={mode === 'kirish' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {msg && <span role="status" className={msg.ok ? 'success' : 'error'}>{msg.text}</span>}
        <button className="btn" type="submit" disabled={busy}>{mode === 'kirish' ? t('Kirish') : t("Ro'yxatdan o'tish")}</button>
      </form>
    </div>
  );
}
