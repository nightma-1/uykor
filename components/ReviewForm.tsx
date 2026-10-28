'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import '@/app/masters.css';
import { addReview, type ReviewState } from '@/lib/review-action';
import { T, type Lang } from '@/lib/i18n';

export default function ReviewForm({ lang, masterId, path }: { lang: Lang; masterId: string; path: string }) {
  const t = T(lang);
  const [state, action, pending] = useActionState<ReviewState, FormData>(addReview, {});
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);

  if (state.ok) return <div className="success">{t("Rahmat! Sharhingiz tekshiruvdan keyin saytda ko'rinadi.")}</div>;
  if (state.login) {
    return (
      <div className="card section" style={{ alignItems: 'flex-start' }}>
        <span>{t('Sharh yozish uchun hisobingizga kiring. Bu soxta sharhlardan himoya qiladi.')}</span>
        <Link href={`/kirish?keyin=${encodeURIComponent(path)}`} className="btn small">{t('Kirish')}</Link>
      </div>
    );
  }
  if (!open) return <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>{t('Sharh yozish')}</button>;

  return (
    <form action={action} className="card section" style={{ gap: 12 }}>
      <input type="hidden" name="master_id" value={masterId} />
      <input type="hidden" name="rating" value={rating || ''} />
      <strong>{t('Usta bilan ishlaganmisiz? Tajribangizni yozing')}</strong>
      <div className="field">
        <span className="label" id="rv-stars">{t('Baho')}</span>
        <div className="stars" role="radiogroup" aria-labelledby="rv-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t('{n} yulduz', { n })} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="rv-body">{t('Sharh')}</label>
        <textarea id="rv-body" name="body" className="input" required minLength={10} maxLength={1500} placeholder={t("Qanday ish qildi, vaqtida keldimi, narxi kelishilganidek bo'ldimi...")} />
      </div>
      {state.error && <span className="error" role="alert">{t(state.error)}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn small" disabled={pending}>{pending ? t('Yuborilmoqda…') : t('Yuborish')}</button>
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>{t('Bekor qilish')}</button>
      </div>
    </form>
  );
}
