import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { isLang, LANGS, SITE, T, alternates } from '@/lib/i18n';
import Fonts from '@/components/Fonts';
import PwaSetup from '@/components/PwaSetup';

export const viewport: Viewport = { themeColor: '#2346A0', width: 'device-width', initialScale: 1 };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: l } = await params;
  const lang = isLang(l) ? l : 'uz';
  const t = T(lang);
  return {
    metadataBase: new URL(SITE),
    openGraph: { siteName: 'Uykor', locale: lang === 'ru' ? 'ru_RU' : 'uz_UZ', type: 'website' },
    title: { default: t('Uykor: Samarqanddagi yangi uylar xaritada'), template: '%s · Uykor' },
    description: t("Novostroykalar xaritada: narx, bo'lib to'lash, kadastr holati, topshirish muddati va quruvchilar reytingi. Maklersiz, komissiyasiz."),
    icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'Uykor', statusBarStyle: 'default' },
    alternates: alternates(lang, '/'),
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang}>
      <head><Fonts /></head>
      <body>{children}<PwaSetup lang={lang} /></body>
    </html>
  );
}
