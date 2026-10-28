import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MasterCard } from '@/components/cards';
import TopBar from '@/components/TopBar';
import { Btn, Empty, F, Loading, Txt } from '@/components/ui';
import { CATEGORIES, getMasters } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

export default function Masters() {
  const { t } = useLang();
  const { data, loading, error, refreshing, refresh, reload } = useLoad(getMasters);
  const [cat, setCat] = useState('all');

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    (data || []).forEach((x) => x.categories.forEach((c) => { m[c] = (m[c] || 0) + 1; }));
    return m;
  }, [data]);
  const list = useMemo(() => (data || []).filter((m) => cat === 'all' || m.categories.includes(cat)), [data, cat]);
  const cats = Object.keys(CATEGORIES).filter((c) => counts[c]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title={t('Ustalar')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {[['all', t('Hammasi'), (data || []).length] as const, ...cats.map((c) => [c, t(CATEGORIES[c]), counts[c]] as const)].map(([k, label, n]) => {
          const on = cat === k;
          return (
            <Pressable
              key={k}
              onPress={() => setCat(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? C.lapis : C.lineStrong, backgroundColor: on ? C.lapis : C.card, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? '#fff' : C.ink }}>{label}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: on ? '#E8EDF8' : C.muted }}>{n}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title={t("Ma'lumot yuklanmadi")} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.lapis} />}
          ListHeaderComponent={<Txt size={14} muted>{t("Tekshirilgan ustalar va haqiqiy mijozlar sharhlari. To'g'ridan-to'g'ri qo'ng'iroq qiling.")}</Txt>}
          ListEmptyComponent={<Empty title={t("Bu yo'nalishda hali usta yo'q")} />}
          renderItem={({ item }) => <MasterCard m={item} />}
        />
      )}
    </View>
  );
}
