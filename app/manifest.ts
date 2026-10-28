import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Uykor — Samarqanddagi uylar',
    short_name: 'Uykor',
    description: "Samarqanddagi yangi uylar xaritada, ijara, sotuv va ustalar. Maklersiz, komissiyasiz.",
    lang: 'uz',
    start_url: '/?manba=ilova',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F4F6F8',
    theme_color: '#2346A0',
    categories: ['lifestyle', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Novostroykalar', url: '/?manba=ilova', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Ijara', url: '/ijara?manba=ilova', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Ustalar', url: '/ustalar?manba=ilova', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Kabinet', url: '/kabinet', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
