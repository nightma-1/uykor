import { ImageResponse } from 'next/og';

// App icons (PWA, Android, iOS) drawn from the logo mark, so no binary files live in the repo.
const MARK = '<path d="M17 58V31C17 21 23.5 13.5 32 9C40.5 13.5 47 21 47 31V58Z" fill="#FFFFFF"/><path d="M25.5 58V46C25.5 42 28.3 39.2 32 37.5C35.7 39.2 38.5 42 38.5 46V58Z" fill="#19A097"/><rect x="29" y="23" width="6" height="6" fill="#2346A0"/><rect x="29" y="23" width="6" height="6" fill="#2346A0" transform="rotate(45 32 26)"/>';
const ROUND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#2346A0"/>${MARK}</svg>`;
// Full-bleed for maskable / iOS icons: the system applies its own corner mask, so keep the mark inside the safe zone.
const FULL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2346A0"/><g transform="translate(6.4 6.4) scale(0.8)">${MARK.replace(/V58Z/g, 'V64Z')}</g></svg>`;

const ICONS: Record<string, { size: number; svg: string }> = {
  'icon-192.png': { size: 192, svg: ROUND },
  'icon-512.png': { size: 512, svg: ROUND },
  'icon-maskable-512.png': { size: 512, svg: FULL },
  'apple-touch-icon.png': { size: 180, svg: FULL },
};

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = ICONS[(await params).name];
  if (!icon) return new Response('Not found', { status: 404 });
  const src = `data:image/svg+xml;base64,${Buffer.from(icon.svg).toString('base64')}`;
  return new ImageResponse(<img src={src} width={icon.size} height={icon.size} alt="" />, {
    width: icon.size,
    height: icon.size,
    headers: { 'Cache-Control': 'public, max-age=604800, immutable' },
  });
}
