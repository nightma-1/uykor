'use client';

import { useEffect, useRef } from 'react';
import type { MapPoint } from './MapView';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { ymaps?: any; __ymapsLoading?: Promise<any> }
}

const KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY || '';
const SAMARQAND: [number, number] = [39.6542, 66.9597];

function loadYmaps(): Promise<any> {
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps);
  if (!window.__ymapsLoading) {
    window.__ymapsLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(KEY)}&lang=ru_RU`;
      s.async = true;
      s.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return window.__ymapsLoading;
}

type Props = { points: MapPoint[]; selectedId?: string | null; onSelect?: (id: string) => void; zoom?: number; interactive?: boolean };

export default function YandexMap({ points, selectedId, onSelect, zoom = 13, interactive = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const ymapsRef = useRef<any>(null);
  const layout = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const latest = useRef({ points, selectedId });
  latest.current = { points, selectedId };

  useEffect(() => {
    let cancelled = false;
    loadYmaps().then((ymaps) => {
      if (cancelled || !el.current || map.current) return;
      ymapsRef.current = ymaps;
      const first = latest.current.points[0];
      const m = new ymaps.Map(
        el.current,
        { center: first ? [first.lat, first.lng] : SAMARQAND, zoom, controls: interactive ? ['zoomControl', 'fullscreenControl'] : [] },
        { suppressMapOpenBlock: true },
      );
      if (!interactive) m.behaviors.disable(['scrollZoom', 'drag']);
      else m.behaviors.disable('scrollZoom');
      layout.current = ymaps.templateLayoutFactory.createClass('<span class="price-pin{{ properties.cls }}">{{ properties.label }}</span>');
      map.current = m;
      draw(true);
    });
    return () => {
      cancelled = true;
      map.current?.destroy();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(fit: boolean) {
    const ymaps = ymapsRef.current;
    const m = map.current;
    if (!ymaps || !m) return;
    const { points: pts, selectedId: sel } = latest.current;
    m.geoObjects.removeAll();
    pts.forEach((p) => {
      const on = p.id === sel;
      const pm = new ymaps.Placemark(
        [p.lat, p.lng],
        { label: p.label, cls: on ? ' on' : '', hintContent: p.title },
        {
          iconLayout: layout.current,
          iconShape: { type: 'Rectangle', coordinates: [[-45, -34], [45, 0]] },
          zIndex: on ? 1000 : 100,
          zIndexHover: 1100,
        },
      );
      pm.events.add('click', () => onSelectRef.current?.(p.id));
      m.geoObjects.add(pm);
    });
    if (fit && pts.length > 1 && !sel) {
      m.setBounds(m.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 50 });
    }
  }

  useEffect(() => {
    draw(!selectedId);
    const s = points.find((p) => p.id === selectedId);
    if (s && map.current) map.current.panTo([s.lat, s.lng], { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selectedId]);

  return <div ref={el} style={{ width: '100%', height: '100%' }} />;
}
