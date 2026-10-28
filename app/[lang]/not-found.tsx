import Link from 'next/link';
import Header from '@/components/Header';
import { lp, T } from '@/lib/i18n';
import { requestLang } from '@/lib/i18n-server';

export default async function NotFound() {
  const lang = await requestLang();
  const t = T(lang);
  return (
    <>
      <Header lang={lang} />
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <h1 className="display" style={{ margin: 0 }}>{t('Sahifa topilmadi')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t("Bu sahifa olib tashlangan yoki manzil noto'g'ri bo'lishi mumkin.")}</p>
        <Link href={lp(lang, '/')} className="btn">{t('Bosh sahifaga qaytish')}</Link>
      </div>
    </>
  );
}
