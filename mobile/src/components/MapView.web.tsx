import { createElement, useEffect, useMemo, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLang } from '@/lib/i18n';
import { mapHtml, type MapPoint } from './mapHtml';

type Props = {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  zoom?: number;
  style?: StyleProp<ViewStyle>;
};

/** Web build (used for previews): the same map page inside an iframe. */
export default function MapView({ points, selectedId = null, onSelect, interactive = true, zoom, style }: Props) {
  const { lang } = useLang();
  const frame = useRef<HTMLIFrameElement | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapHtml({ points, selected: selectedId, lang, interactive, zoom }), [lang]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ type: 'set', points, selected: selectedId }), '*');
  }, [points, selectedId]);

  useEffect(() => {
    const fn = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      try {
        const d = JSON.parse(String(e.data));
        if (d.type === 'select') onSelect?.(d.id);
      } catch { /* ignore */ }
    };
    window.addEventListener('message', fn);
    return () => window.removeEventListener('message', fn);
  }, [onSelect]);

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#EAEFE8' }, style]}>
      {createElement('iframe', { ref: frame, srcDoc: html, title: 'map', style: { border: 0, width: '100%', height: '100%' } })}
    </View>
  );
}
