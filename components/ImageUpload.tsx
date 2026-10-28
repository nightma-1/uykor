'use client';

import { useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { T, type Lang } from '@/lib/i18n';

const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Shrinks a photo to at most 1600px on the long side and re-encodes it as WebP.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('rasm'))), 'image/webp', 0.82));
}

type Props = {
  name: string;
  folder: string;
  defaultUrl?: string | null;
  label: string;
  lang?: Lang;
  autoSubmit?: boolean;
  bucket?: string;
  /** Private bucket: the field gets the storage path instead of a public URL, and no preview is shown. */
  privateFile?: boolean;
};

export default function ImageUpload({ name, folder, defaultUrl, label, autoSubmit, bucket = 'rasmlar', privateFile, lang = 'uz' }: Props) {
  const t = T(lang);
  const [url, setUrl] = useState(defaultUrl || '');
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const id = `up-${name}-${folder}`.replace(/[^a-z0-9-]/gi, '');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState('busy');
    try {
      const blob = await shrink(file);
      const path = `${folder}/${crypto.randomUUID()}.webp`;
      const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: 'image/webp' });
      if (error) throw error;
      const pub = privateFile ? path : sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      setUrl(pub);
      setState('idle');
      if (autoSubmit && hiddenRef.current) {
        hiddenRef.current.value = pub;
        hiddenRef.current.form?.requestSubmit();
      }
    } catch {
      setState('error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={url} ref={hiddenRef} readOnly />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {url && !autoSubmit && (
          <img src={url} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
        )}
        <label className="btn ghost small" htmlFor={id} style={{ cursor: 'pointer' }}>
          {state === 'busy' ? t('Yuklanmoqda…') : url && !autoSubmit ? t('Boshqa rasm') : t('Rasm tanlash')}
        </label>
        <input id={id} ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} disabled={state === 'busy'} />
        {url && !autoSubmit && (
          <button type="button" className="btn ghost small" onClick={() => setUrl('')}>{t('Olib tashlash')}</button>
        )}
      </div>
      {state === 'error' && <span className="error">{t("Rasm yuklanmadi. JPG, PNG yoki WEBP, 6 MB gacha bo'lsin.")}</span>}
    </div>
  );
}
