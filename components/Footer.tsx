import Link from 'next/link';
import { Wordmark } from './Logo';
import { lp, T, type Lang } from '@/lib/i18n';

export default function Footer({ lang }: { lang: Lang }) {
  const t = T(lang);
  const l = (p: string) => lp(lang, p);
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Wordmark size={18} />
          <span>{t("Samarqanddagi yangi uylar. Vositachisiz, to'g'ridan-to'g'ri quruvchidan.")}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href={l('/')}>{t('Novostroykalar')}</Link>
          <Link href={l('/ijara')}>{t('Ijara')}</Link>
          <Link href={l('/sotuv')}>{t('Sotuv')}</Link>
          <Link href={l('/ustalar')}>{t('Ustalar')}</Link>
          <Link href={l('/quruvchilar')}>{t('Quruvchilar reytingi')}</Link>
          <Link href={l('/quruvchilarga')}>{t('Quruvchilar uchun')}</Link>
        </div>
      </div>
    </footer>
  );
}
