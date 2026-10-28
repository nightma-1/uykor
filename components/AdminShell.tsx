import Link from 'next/link';
import { Mark, Wordmark } from './Logo';
import LangSwitch from './LangSwitch';
import { signOut } from '@/app/(app)/admin/actions';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';

export default async function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const lang = await getLang();
  const t = T(lang);
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link href="/admin" className="brand"><Mark size={30} /><Wordmark size={19} /><span className="chip gray">{t('Admin')}</span></Link>
          <nav className="admin-nav" style={{ flex: '1 1 auto' }}>
            <Link href="/admin">{t('Arizalar')}</Link>
            <Link href="/admin/elonlar">{t("E'lonlar")}</Link>
            <Link href="/admin/ustalar">{t('Ustalar')}</Link>
            <Link href="/admin/majmualar">{t('Majmualar')}</Link>
            <Link href="/admin/quruvchilar">{t('Quruvchilar')}</Link>
            <Link href={lang === 'ru' ? '/ru' : '/'} target="_blank">{t('Saytni ochish ↗')}</Link>
          </nav>
          <form action={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LangSwitch lang={lang} />
            <span className="muted" style={{ fontSize: 13 }}>{email}</span>
            <button className="btn ghost small" type="submit">{t('Chiqish')}</button>
          </form>
        </div>
      </header>
      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</main>
    </>
  );
}
