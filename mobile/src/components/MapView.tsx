import React, { useEffect, useMemo, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';
import { useLang } from '@/lib/i18n';
import { mapHtml, type MapPoint } from './mapHtml';

// The package's class typings clash with React 19 types; the runtime component is fine.
const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown> & { ref?: React.Ref<RNWebView> }>;

type Props = {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  zoom?: number;
  style?: StyleProp<ViewStyle>;
};

export default function MapView({ points, selectedId = null, onSelect, interactive = true, zoom, style }: Props) {
  const { lang } = useLang();
  const ref = useRef<RNWebView>(null);
  // The page is built once; later changes are pushed in without reloading the map.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapHtml({ points, selected: selectedId, lang, interactive, zoom }), [lang]);

  useEffect(() => {
    ref.current?.injectJavaScript(`window.uykorSet && window.uykorSet(${JSON.stringify(points)}, ${JSON.stringify(selectedId)}); true;`);
  }, [points, selectedId]);

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#EAEFE8' }, style]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://uykor.uz' }}
        onMessage={(e: WebViewMessageEvent) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d.type === 'select') onSelect?.(d.id);
          } catch { /* ignore */ }
        }}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
