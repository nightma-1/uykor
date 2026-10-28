import { ImageResponse } from 'next/og';
import { OG_SIZE, OgMark } from '@/lib/og';
import { isLang, T } from '@/lib/i18n';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Uykor';

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  const t = T(isLang(l) ? l : 'uz');
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#F4F6F8', padding: 72, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <OgMark size={84} />
          <div style={{ fontSize: 64, fontWeight: 800, color: '#14213D', letterSpacing: -2 }}>Uykor</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, color: '#14213D', lineHeight: 1.1, letterSpacing: -1.5 }}>{t('Samarqanddagi yangi uylar xaritada')}</div>
          <div style={{ fontSize: 32, color: '#5B6475' }}>{t("Narx, bo'lib to'lash, kadastr va quruvchilar reytingi")}</div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#0B6B65', background: '#E3F2EF', padding: '12px 24px', borderRadius: 999 }}>{t('Maklersiz, komissiyasiz')}</div>
        </div>
      </div>
    ),
    size,
  );
}
