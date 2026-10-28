'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { T, type Lang } from '@/lib/i18n';
import type { CallHours } from '@/lib/contact';
import PhoneReveal from './PhoneReveal';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

const REASONS = [
  { id: 'makler', label: 'Bu makler, egasi emas' },
  { id: 'band', label: 'Allaqachon band yoki sotilgan' },
  { id: 'yolgon', label: "Ma'lumot yolg'on" },
  { id: 'boshqa', label: 'Boshqa sabab' },
] as const;

export default function ListingContact({ lang, id, hours, name }: { lang: Lang; id: string; hours: CallHours; name: string }) {
  const t = T(lang);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['id']>('makler');
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState<'no' | 'busy' | 'ok' | 'err'>('no');

  useEffect(() => {
    sb.rpc('listing_view', { lid: id }).then(() => {}, () => {});
  }, [id]);

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setSent('busy');
    const { error } = await sb.from('listing_reports').insert({ listing_id: id, reason, comment: comment.trim() });
    setSent(error ? 'err' : 'ok');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {name && <div><div className="muted" style={{ fontSize: 13 }}>{t("E'lon beruvchi")}</div><strong>{name}</strong></div>}
      <PhoneReveal lang={lang} kind="elon" id={id} hours={hours} />
      <div className="notice">
        <span>{t("Bu yerda makler yo'q: siz to'g'ridan-to'g'ri e'lon egasi bilan gaplashasiz. Hech kimga komissiya to'lamang.")}</span>
      </div>

      {!reportOpen && sent !== 'ok' && (
        <button type="button" className="btn ghost small" onClick={() => setReportOpen(true)} style={{ alignSelf: 'flex-start' }}>{t('Shikoyat qilish')}</button>
      )}
      {sent === 'ok' && <div className="success">{t('Rahmat! Shikoyatingizni tekshiramiz.')}</div>}
      {reportOpen && sent !== 'ok' && (
        <form onSubmit={report} className="card section" style={{ gap: 10, padding: 14 }}>
          <strong>{t("Nima noto'g'ri?")}</strong>
          {REASONS.map((r) => (
            <label key={r.id} className="check" style={{ minHeight: 36 }}>
              <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} /> {t(r.label)}
            </label>
          ))}
          <label htmlFor="rep-c" className="muted" style={{ fontSize: 13 }}>{t('Izoh (ixtiyoriy)')}</label>
          <textarea id="rep-c" className="input" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          {sent === 'err' && <span className="error">{t("Yuborilmadi. Qayta urinib ko'ring.")}</span>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn small" disabled={sent === 'busy'}>{t('Yuborish')}</button>
            <button type="button" className="btn ghost small" onClick={() => setReportOpen(false)}>{t('Bekor qilish')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
