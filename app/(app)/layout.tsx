import type { Metadata, Viewport } from 'next';
import '../globals.css';
import Fonts from '@/components/Fonts';
import PwaSetup from '@/components/PwaSetup';
import { getLang } from '@/lib/i18n-server';
import { SITE, T } from '@/lib/i18n';

export const viewport: Viewport = { themeColor: '#2346A0', width: 'device-width', initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const t = T(await getLang());
  return {
    metadataBase: new URL(SITE),
    title: { default: t('Uykor: Samarqanddagi yangi uylar xaritada'), template: '%s · Uykor' },
    icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'Uykor', statusBarStyle: 'default' },
    robots: { index: false },
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <head><Fonts /></head>
      <body>{children}<PwaSetup lang={lang} offer={false} /></body>
    </html>
  );
}
