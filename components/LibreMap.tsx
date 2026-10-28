'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import type { MapPoint } from './MapView';

export type MapStyle = 'liberty' | 'positron' | 'bright';

type Props = {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  zoom?: number;
  interactive?: boolean;
  lang?: 'uz' | 'ru';
  mapStyle?: MapStyle;
};

const SAMARQAND: [number, number] = [66.9597, 39.6542]; // lng, lat

// Uzbek name first, then the Latin form, then the local name.
const LABEL = ['coalesce', ['get', 'name:uz'], ['get', 'name_int'], ['get', 'name:latin'], ['get', 'name']];
const LABEL_RU = ['coalesce', ['get', 'name:ru'], ['get', 'name'], ['get', 'name_int']];

export default function LibreMap({ points, selectedId, onSelect, zoom = 13, interactive = true, mapStyle = 'bright', lang = 'uz' }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const latest = useRef({ points, selectedId });
  latest.current = { points, selectedId };

  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl').then((mod) => {
      if (cancelled || !el.current || map.current) return;
      lib.current = mod;
      const first = latest.current.points[0];
      const m = new mod.Map({
        container: el.current,
        style: `https://tiles.openfreemap.org/styles/${mapStyle}`,
        center: first ? [first.lng, first.lat] : SAMARQAND,
        zoom: zoom - 0.5,
        interactive,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
      if (interactive) {
        m.addControl(new mod.NavigationControl({ showCompass: false }), 'top-right');
        m.scrollZoom.disable();
        m.touchZoomRotate.disableRotation();
        m.dragRotate.disable();
      }
      m.on('style.load', () => {
        m.getStyle().layers.forEach((l) => {
          if (l.type === 'symbol' && m.getLayoutProperty(l.id, 'text-field') !== undefined) {
            try { m.setLayoutProperty(l.id, 'text-field', (lang === 'ru' ? LABEL_RU : LABEL) as never); } catch { /* layer without names */ }
          }
        });
      });
      map.current = m;
      draw(true);
    });
    return () => {
      cancelled = true;
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  function draw(fit: boolean) {
    const mod = lib.current;
    const m = map.current;
    if (!mod || !m) return;
    const { points: pts, selectedId: sel } = latest.current;
    markers.current.forEach((mk) => mk.remove());
    markers.current = pts.map((p) => {
      const on = p.id === sel;
      const wrap = document.createElement('div');
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `price-pin${on ? ' on' : ''}`;
      pin.textContent = p.label;
      pin.title = p.title;
      pin.setAttribute('aria-label', p.title);
      pin.addEventListener('click', (e) => { e.stopPropagation(); onSelectRef.current?.(p.id); });
      wrap.appendChild(pin);
      wrap.style.zIndex = on ? '2' : '1';
      return new mod.Marker({ element: wrap, anchor: 'top-left' }).setLngLat([p.lng, p.lat]).addTo(m);
    });
    if (fit && pts.length > 1 && !sel) {
      const b = new mod.LngLatBounds();
      pts.forEach((p) => b.extend([p.lng, p.lat]));
      m.fitBounds(b, { padding: 60, maxZoom: 14, duration: 0 });
    }
  }

  useEffect(() => {
    draw(!selectedId);
    const s = points.find((p) => p.id === selectedId);
    if (s && map.current) map.current.easeTo({ center: [s.lng, s.lat], duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selectedId]);

  return <div ref={el} style={{ width: '100%', height: '100%' }} />;
}
