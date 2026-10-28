import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { Chip, Txt } from './ui';

/** Swipeable full-width photo strip with a counter. */
export default function Gallery({ photos, empty, height = 260 }: { photos: { id: string; url: string; caption?: string }[]; empty: string; height?: number }) {
  const { width } = useWindowDimensions();
  const { t } = useLang();
  const [i, setI] = useState(0);
  if (!photos.length) {
    return (
      <View style={{ height: height * 0.7, backgroundColor: C.placeholder, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="#3D4F78">{empty}</Txt>
      </View>
    );
  }
  return (
    <View>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.id}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} style={{ width, height, backgroundColor: C.placeholder }} contentFit="cover" accessibilityLabel={item.caption || t('Rasm')} />
        )}
      />
      {photos.length > 1 && (
        <View style={{ position: 'absolute', right: 12, bottom: 12 }}>
          <Chip label={`${i + 1} / ${photos.length}`} />
        </View>
      )}
    </View>
  );
}
