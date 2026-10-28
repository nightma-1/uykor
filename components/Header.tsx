import Link from 'next/link';
import { Mark, Wordmark } from './Logo';
import LangSwitch from './LangSwitch';
import { lp, T, type Lang } from '@/lib/i18n';

type Active = 'novostroyka' | 'ijara' | 'kunlik' | 'sotuv' | 'ustalar' | 'quruvchilar' | 'kabinet';

export default function Header({ lang, active }: { lang: Lang; active?: Active }) {
  const t = T(lang);
  const cls = (a: Active) => (active === a ? 'active' : '');
  const l = (p: string) => lp(lang, p);
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href={l('/')} className="brand" aria-label={t('Uykor, bosh sahifa')}>
          <Mark />
          <Wordmark />
        </Link>
        <nav className="nav" aria-label={t("Bo'limlar")}>
          <Link href={l('/')} className={cls('novostroyka')}>{t('Novostroykalar')}</Link>
          <Link href={l('/ijara')} className={cls('ijara')}>{t('Ijara')}</Link>
          <Link href={l('/kunlik')} className={cls('kunlik')}>{t('Kunlik')}</Link>
          <Link href={l('/sotuv')} className={cls('sotuv')}>{t('Sotuv')}</Link>
          <Link href={l('/ustalar')} className={cls('ustalar')}>{t('Ustalar')}</Link>
          <Link href={l('/quruvchilar')} className={cls('quruvchilar')}>{t('Quruvchilar reytingi')}</Link>
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LangSwitch lang={lang} />
          <Link href="/kabinet/sevimlilar" className="btn ghost small" aria-label={t('Sevimlilar va eslatmalar')} title={t('Sevimlilar va eslatmalar')}>♥</Link>
          <Link href="/kabinet" className={`btn ghost small${active === 'kabinet' ? ' on' : ''}`}>{t('Kabinet')}</Link>
          <Link href="/kabinet/elon/yangi" className="btn small">{t("+ E'lon")}</Link>
        </div>
      </div>
    </header>
  );
}
