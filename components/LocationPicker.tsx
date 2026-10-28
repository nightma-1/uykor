'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import { T, type Lang } from '@/lib/i18n';

const SAMARQAND: [number, number] = [66.9597, 39.6542];

// Click on the map to place the home; writes lat/lng into hidden form fields.
export default function LocationPicker({ lang, lat, lng }: { lang: Lang; lat: number | null; lng: number | null }) {
  const t = T(lang);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);

  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl').then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const m = new mod.Map({
        container: el.current,
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: pos ? [pos.lng, pos.lat] : SAMARQAND,
        zoom: pos ? 15 : 12,
        attributionControl: { compact: true },
      });
      m.addControl(new mod.NavigationControl({ showCompass: false }), 'top-right');
      m.dragRotate.disable();
      const place = (p: { lat: number; lng: number }) => {
        if (!marker.current) marker.current = new mod.Marker({ color: '#2346A0' }).setLngLat([p.lng, p.lat]).addTo(m);
        else marker.current.setLngLat([p.lng, p.lat]);
      };
      if (pos) place(pos);
      m.on('click', (e) => {
        const p = { lat: Number(e.lngLat.lat.toFixed(6)), lng: Number(e.lngLat.lng.toFixed(6)) };
        place(p);
        setPos(p);
      });
      map.current = m;
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="field">
      <span className="label">{t('Xaritadagi joyi')}</span>
      <span className="muted" style={{ fontSize: 13 }}>{t('Uy joylashgan joyni xaritada bosing. Kattalashtirish uchun + tugmasidan foydalaning.')}</span>
      <input type="hidden" name="lat" value={pos?.lat ?? ''} />
      <input type="hidden" name="lng" value={pos?.lng ?? ''} />
      <div className="card" style={{ height: 320, overflow: 'hidden' }}><div ref={el} style={{ width: '100%', height: '100%' }} /></div>
      <span style={{ fontSize: 13 }} className={pos ? 'muted' : 'error'}>{pos ? `${t('Tanlandi')}: ${pos.lat}, ${pos.lng}` : t('Joy hali tanlanmagan')}</span>
    </div>
  );
}
