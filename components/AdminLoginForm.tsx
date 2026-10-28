'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Mark, Wordmark } from '@/components/Logo';
import LangSwitch from '@/components/LangSwitch';
import { T, type Lang } from '@/lib/i18n';

const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AdminLoginForm({ lang }: { lang: Lang }) {
  const t = T(lang);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  useEffect(() => { setNoAccess(new URLSearchParams(window.location.search).get('xato') === 'ruxsat'); }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMsg(t("Email yoki parol noto'g'ri.")); return; }
    window.location.href = '/admin';
  }

  async function signUp() {
    if (password.length < 8) { setMsg(t("Parol kamida 8 ta belgidan iborat bo'lsin.")); return; }
    setBusy(true); setMsg('');
    const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    setMsg(error ? `${t("Ro'yxatdan o'tib bo'lmadi")}: ${error.message}` : t('Pochtangizga tasdiqlash xati yuborildi. Tasdiqlagach, admin huquqi berilishini kuting.'));
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={signIn} className="card section" style={{ width: '100%', maxWidth: 400, gap: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Mark /><Wordmark /></span><LangSwitch lang={lang} /></div>
        <h1 className="h2">{t('Admin panelga kirish')}</h1>
        {noAccess && <span className="error">{t("Bu hisobda admin huquqi yo'q.")}</span>}
        <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">{t('Parol')}</label><input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {msg && <span role="status" style={{ fontSize: 14 }}>{msg}</span>}
        <button className="btn" type="submit" disabled={busy}>{t('Kirish')}</button>
        <button className="btn ghost" type="button" disabled={busy || !email} onClick={signUp}>{t("Ro'yxatdan o'tish")}</button>
      </form>
    </div>
  );
}
