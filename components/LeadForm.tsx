'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { T, type Lang } from '@/lib/i18n';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

export default function LeadForm({ lang, complexId, apartmentId, idPrefix = 'lead' }: { lang: Lang; complexId: string; apartmentId?: string; idPrefix?: string }) {
  const t = T(lang);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function send(kind: 'korish' | 'qongiroq') {
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) { setErr(t('Ismingizni yozing.')); return; }
    if (digits.length < 9) { setErr(t("Telefon raqamni to'liq yozing, masalan +998 90 123 45 67.")); return; }
    setErr('');
    setState('sending');
    const { error } = await sb.from('leads').insert({ complex_id: complexId, apartment_id: apartmentId ?? null, name: name.trim(), phone: phone.trim(), kind });
    if (error) { setState('error'); setErr(t("Ariza yuborilmadi. Internetni tekshirib, qayta urinib ko'ring.")); return; }
    setState('done');
  }

  if (state === 'done') {
    return <div className="success">{t("Arizangiz quruvchiga yuborildi. Tez orada siz bilan bog'lanishadi.")}</div>;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); send('korish'); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`} style={{ textTransform: 'none', fontSize: 13, color: 'var(--ink)' }}>{t('Ismingiz')}</label>
        <input id={`${idPrefix}-name`} className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-phone`} style={{ textTransform: 'none', fontSize: 13, color: 'var(--ink)' }}>{t('Telefon raqam')}</label>
        <input id={`${idPrefix}-phone`} className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {err && <span className="error" role="alert">{err}</span>}
      <button type="submit" className="btn" disabled={state === 'sending'} style={{ minHeight: 48 }}>
        {state === 'sending' ? t('Yuborilmoqda…') : t("Ko'rishga yozilish")}
      </button>
      <button type="button" className="btn ghost" disabled={state === 'sending'} style={{ minHeight: 48 }} onClick={() => send('qongiroq')}>
        {t("Qo'ng'iroq so'rash")}
      </button>
    </form>
  );
}
