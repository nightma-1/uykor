'use client';

import { useState } from 'react';
import '@/app/contact.css';
import { createClient } from '@supabase/supabase-js';
import { hoursText, type CallHours } from '@/lib/contact';
import { T, type Lang } from '@/lib/i18n';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

type Kind = 'elon' | 'usta' | 'quruvchi';
type State = { s: 'idle' | 'busy' | 'err' } | { s: 'open'; phone: string } | { s: 'closed' } | { s: 'none' };

/**
 * "Show phone" button. The number comes from contact_phone(), which hands it out
 * only inside the owner's call hours; outside them the visitor sees when to call.
 */
export default function PhoneReveal({ lang, kind, id, hours, label }: { lang: Lang; kind: Kind; id: string; hours: CallHours; label?: string }) {
  const t = T(lang);
  const [st, setSt] = useState<State>({ s: 'idle' });
  const [copied, setCopied] = useState(false);
  const when = hoursText(hours, lang);

  async function reveal() {
    setSt({ s: 'busy' });
    const { data, error } = await sb.rpc('contact_phone', { kind, rid: id });
    if (error || !data) return setSt({ s: 'err' });
    const r = data as { open: boolean; phone: string | null; none?: boolean };
    if (r.none) return setSt({ s: 'none' });
    setSt(r.open && r.phone ? { s: 'open', phone: r.phone } : { s: 'closed' });
  }

  async function copy(p: string) {
    try { await navigator.clipboard.writeText(p); setCopied(true); } catch { /* the number stays selectable */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {st.s === 'open' ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={`tel:${st.phone.replace(/[^\d+]/g, '')}`} className="btn" style={{ flex: '1 1 auto', minHeight: 48, fontSize: 18, userSelect: 'all' }}>{st.phone}</a>
          <button type="button" className="btn ghost" style={{ minHeight: 48 }} onClick={() => copy(st.phone)}>{copied ? t('Nusxa olindi') : t('Nusxa')}</button>
        </div>
      ) : st.s === 'closed' ? (
        <div className="notice warn-notice" role="status">
          <span>{t("Hozir qo'ng'iroq vaqti emas. Qo'ng'iroq qilish mumkin: {w}.", { w: when })}</span>
        </div>
      ) : st.s === 'none' ? (
        <span className="muted">{t("Telefon ko'rsatilmagan.")}</span>
      ) : (
        <button type="button" className="btn" style={{ minHeight: 48 }} onClick={reveal} disabled={st.s === 'busy'}>{label || t("Telefon raqamni ko'rsatish")}</button>
      )}
      {st.s === 'err' && <span className="error">{t("Yuklab bo'lmadi. Qayta urinib ko'ring.")}</span>}
      <span className="muted" style={{ fontSize: 13 }}>🕘 {t("Qo'ng'iroq vaqti")}: {when}</span>
    </div>
  );
}
