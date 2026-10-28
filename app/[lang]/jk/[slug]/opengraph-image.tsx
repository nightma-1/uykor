import { ImageResponse } from 'next/og';
import { OG_SIZE, OgMark } from '@/lib/og';
import { getComplex } from '@/lib/data';
import { dueLabel, minPrice, mln } from '@/lib/format';
import { isLang, T } from '@/lib/i18n';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Uykor: majmua';
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug, lang: l } = await params;
  const lang = isLang(l) ? l : 'uz';
  const t = T(lang);
  const data = await getComplex(slug);
  const c = data?.complex;
  const d = data?.developer;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#F4F6F8', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, width: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <OgMark size={60} />
            <div style={{ fontSize: 44, fontWeight: 800, color: '#14213D', letterSpacing: -1.5 }}>Uykor</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 60, fontWeight: 800, color: '#14213D', lineHeight: 1.1, letterSpacing: -1.5 }}>{c?.name ?? t('Yangi uylar')}</div>
            {c && <div style={{ display: 'flex', fontSize: 30, color: '#5B6475' }}>{`${t(c.city)}, ${c.district}${d ? ` · ${d.name}` : ''}`}</div>}
          </div>
          {c && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#FFFFFF', background: '#2346A0', padding: '12px 22px', borderRadius: 14 }}>{t("{n} mln so'mdan", { n: mln(minPrice(c)) })}</div>
              {c.installment_months > 0 && <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#2346A0', background: '#EEF2FA', padding: '12px 20px', borderRadius: 14 }}>{t("{n} oygacha bo'lib to'lash", { n: c.installment_months })}</div>}
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#3D4657', background: '#E6E9EF', padding: '12px 20px', borderRadius: 14 }}>{dueLabel(c, lang)}</div>
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
