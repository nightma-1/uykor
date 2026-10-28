'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LMap, Marker } from 'leaflet';
import YandexMap from './YandexMap';
import LibreMap, { type MapStyle } from './LibreMap';

export type MapPoint = { id: string; lat: number; lng: number; label: string; title: string };

type Props = {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  zoom?: number;
  interactive?: boolean;
  lang?: 'uz' | 'ru';
};

const SAMARQAND: [number, number] = [39.6542, 66.9597];

// OpenFreeMap vector map by default; Yandex if a key is ever configured.
export default function MapView(props: Props & { mapStyle?: MapStyle; engine?: 'osm' }) {
  if (props.engine === 'osm') return <LeafletMap {...props} />;
  return process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY ? <YandexMap {...props} /> : <LibreMap {...props} />;
}

function LeafletMap({ points, selectedId, onSelect, zoom = 13, interactive = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const L = useRef<typeof import('leaflet') | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      if (cancelled || !el.current || map.current) return;
      L.current = mod;
      const m = mod.map(el.current, {
        center: points[0] ? [points[0].lat, points[0].lng] : SAMARQAND,
        zoom,
        scrollWheelZoom: interactive,
        dragging: interactive,
        zoomControl: interactive,
      });
      mod.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      map.current = m;
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const mod = L.current;
    const m = map.current;
    if (!mod || !m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();
    points.forEach((p) => {
      const on = p.id === selectedId;
      const icon = mod.divIcon({
        className: 'pin-wrap',
        html: `<span class="price-pin${on ? ' on' : ''}" title="${p.title.replace(/"/g, '&quot;')}">${p.label}</span>`,
        iconSize: [0, 0],
      });
      const mk = mod.marker([p.lat, p.lng], { icon, zIndexOffset: on ? 1000 : 0, keyboard: true, title: p.title });
      mk.on('click', () => onSelectRef.current?.(p.id));
      mk.addTo(m);
      markers.current.set(p.id, mk);
    });
    if (points.length > 1 && !selectedId) {
      m.fitBounds(mod.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 14 });
    }
  }

  // Redraw markers when data or selection change.
  useEffect(() => {
    draw();
    const sel = points.find((p) => p.id === selectedId);
    if (sel && map.current) map.current.panTo([sel.lat, sel.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selectedId]);

  return <div ref={el} style={{ width: '100%', height: '100%' }} />;
}
