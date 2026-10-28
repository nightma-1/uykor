import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { ListingCard } from '@/components/cards';
import TopBar from '@/components/TopBar';
import { Btn, Empty, Loading, Seg, Txt } from '@/components/ui';
import { getListings } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { SITE } from '@/lib/supabase';
import { C } from '@/lib/theme';
import type { ListingKind } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

const LEAD: Record<ListingKind, string> = {
  ijara: "Uzoq muddatli ijara to'g'ridan-to'g'ri uy egasidan. Makler yo'q, komissiya yo'q.",
  kunlik: 'Sutkalik ijara egasidan, vositachisiz.',
  sotuv: "Ikkilamchi bozor: makler foizisiz, to'g'ridan-to'g'ri egasidan.",
};

export default function Listings() {
  const { t } = useLang();
  const [kind, setKind] = useState<ListingKind>('ijara');
  const [rooms, setRooms] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const { data, loading, error, refreshing, refresh, reload } = useLoad(() => getListings(kind), [kind]);

  const list = useMemo(
    () => (data || []).filter((l) => rooms === 'all' || (rooms === '4' ? (l.rooms ?? 0) >= 4 : l.rooms === Number(rooms))),
    [data, rooms],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title={t("E'lonlar")} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
        <Seg
          options={[
            { value: 'ijara', label: t('Ijara') },
            { value: 'kunlik', label: t('Kunlik') },
            { value: 'sotuv', label: t('Sotuv') },
          ]}
          value={kind}
          onChange={setKind}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Seg
            scroll
            options={[
              { value: 'all', label: t('Hammasi') },
              { value: '1', label: t('1 xona') },
              { value: '2', label: t('2 xona') },
              { value: '3', label: t('3 xona') },
              { value: '4', label: t('4+ xona') },
            ]}
            value={rooms}
            onChange={setRooms}
          />
        </ScrollView>
      </View>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title={t("Ma'lumot yuklanmadi")} text={t('Internetni tekshirib, qayta urinib ko\'ring.')} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.lapis} />}
          ListHeaderComponent={<Txt size={14} muted>{t(LEAD[kind])}</Txt>}
          ListEmptyComponent={
            <Empty
              title={t("Hozircha e'lon yo'q")}
              text={t("Uyingizni ijaraga bermoqchi yoki sotmoqchimisiz? E'lon bepul.")}
              action={<Btn kind="ghost" title={t("E'lon joylash")} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/kabinet/elon/yangi?tur=${kind}`)} />}
            />
          }
          renderItem={({ item }) => <ListingCard l={item} />}
          ListFooterComponent={list.length ? (
            <Btn kind="ghost" title={t("+ E'lon joylash")} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/kabinet/elon/yangi?tur=${kind}`)} style={{ marginTop: 6 }} />
          ) : undefined}
        />
      )}
    </View>
  );
}
