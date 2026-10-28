'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <div style={{ height: '100%', background: '#EAEFE8' }} /> });

export default function MiniMap({ lat, lng, label, lang = 'uz' }: { lat: number; lng: number; label: string; lang?: 'uz' | 'ru' }) {
  return (
    <div className="card" style={{ height: 240, overflow: 'hidden' }}>
      <MapView points={[{ id: 'x', lat, lng, label, title: label }]} selectedId="x" zoom={15} lang={lang} />
    </div>
  );
}
