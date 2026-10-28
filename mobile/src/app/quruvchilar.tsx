import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Btn, Chip, Empty, F, Loading, Txt, s } from '@/components/ui';
import { getDevelopers } from '@/lib/api';
import { som } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

export default function Developers() {
  const { t } = useLang();
  const { data, loading, error, refreshing, refresh, reload } = useLoad(getDevelopers);
  if (loading) return <Loading />;
  if (error) return <Empty title={t("Ma'lumot yuklanmadi")} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />;

  return (
    <FlatList
      data={data || []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.lapis} />}
      ListHeaderComponent={
        <Txt size={14} muted style={{ marginBottom: 6 }}>
          {t("Reyting to'rtta faktdan hisoblanadi: o'z vaqtida topshirish (40%), xaridorlar bahosi (30%), kadastr tezligi (20%) va hujjatlar ochiqligi (10%). Uni pulga sotib bo'lmaydi.")}
        </Txt>
      }
      renderItem={({ item: d, index }) => (
        <Pressable onPress={() => router.push(`/quruvchi/${d.slug}`)} accessibilityRole="link" style={({ pressed }) => [s.card, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.9 : 1 }]}>
          <Txt muted style={{ width: 20 }}>{index + 1}</Txt>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="bold">{d.name}</Txt>
            <Txt size={13} muted>{t("{a}/{b} o'z vaqtida", { a: d.delivered_on_time, b: d.delivered_total })} · {t('{n} sotilgan', { n: som(d.sold_units) })} · {t('{n} qurilmoqda', { n: d.building_now })}</Txt>
            {d.verified && <Chip kind="turq" label={t('Tekshirilgan')} />}
          </View>
          <Txt size={22} color={C.lapis} style={{ fontFamily: F.bold }}>★ {Number(d.rating).toFixed(1)}</Txt>
        </Pressable>
      )}
    />
  );
}
