import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { ComplexCard } from '@/components/cards';
import { IconList, IconMap } from '@/components/icons';
import MapView from '@/components/MapView';
import TopBar from '@/components/TopBar';
import { Btn, Empty, F, Loading, Seg, Txt } from '@/components/ui';
import { getComplexes } from '@/lib/api';
import { minPrice, mln } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

type Rooms = 'all' | '1' | '2' | '3' | '4';
type Sort = 'rating' | 'cheap' | 'soon';

export default function Home() {
  const { t } = useLang();
  const { data, loading, error, refreshing, refresh, reload } = useLoad(getComplexes);
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [rooms, setRooms] = useState<Rooms>('all');
  const [sort, setSort] = useState<Sort>('rating');
  const [inst, setInst] = useState(false);
  const [kad, setKad] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => {
    const out = (data || []).filter((c) => {
      if (rooms !== 'all' && !c.unit_types.some((u) => (rooms === '4' ? u.rooms >= 4 : u.rooms === Number(rooms)))) return false;
      if (inst && c.installment_months <= 0) return false;
      if (kad && c.kadastr_status !== 'bor') return false;
      return true;
    });
    if (sort === 'cheap') out.sort((a, b) => minPrice(a) - minPrice(b));
    else if (sort === 'soon') {
      const k = (c: (typeof out)[number]) => (c.status === 'topshirilgan' ? '0' : c.promised_date || '9');
      out.sort((a, b) => k(a).localeCompare(k(b)));
    } else out.sort((a, b) => b.developer.rating - a.developer.rating);
    return out;
  }, [data, rooms, sort, inst, kad]);

  const points = useMemo(() => list.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, label: `${mln(c.price_m2, 1)} ${t('mln')}`, title: c.name })), [list, t]);
  const sel = list.find((c) => c.id === selected);

  const toggle = (
    <Pressable
      onPress={() => setMode(mode === 'list' ? 'map' : 'list')}
      accessibilityRole="button"
      accessibilityLabel={mode === 'list' ? t('Xaritada ko\'rish') : t("Ro'yxat")}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.lapis }}
    >
      {mode === 'list' ? <IconMap /> : <IconList />}
      <Txt size={14} color={C.lapis} style={{ fontFamily: F.semi }}>{mode === 'list' ? t('Xarita') : t("Ro'yxat")}</Txt>
    </Pressable>
  );

  const filters = (
    <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Seg
          scroll
          options={[
            { value: 'rating', label: t("Reyting bo'yicha") },
            { value: 'cheap', label: t('Arzonroq') },
            { value: 'soon', label: t('Tezroq topshiriladi') },
          ]}
          value={sort}
          onChange={setSort}
        />
        <Seg scroll options={[{ value: 1, label: t("Bo'lib to'lash") }]} value={inst ? 1 : 0} onChange={() => setInst(!inst)} />
        <Seg scroll options={[{ value: 1, label: t('Kadastr bor') }]} value={kad ? 1 : 0} onChange={() => setKad(!kad)} />
      </ScrollView>
    </View>
  );

  const body = loading ? (
    <Loading />
  ) : error ? (
    <Empty title={t("Ma'lumot yuklanmadi")} text={t('Internetni tekshirib, qayta urinib ko\'ring.')} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />
  ) : mode === 'map' ? (
    <View style={{ flex: 1 }}>
      <MapView points={points} selectedId={selected} onSelect={setSelected} style={{ flex: 1 }} />
      {sel && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
          <ComplexCard c={sel} />
        </View>
      )}
    </View>
  ) : (
    <FlatList
      data={list}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.lapis} />}
      ListHeaderComponent={
        <View style={{ gap: 4, marginBottom: 4 }}>
          {list.some((c) => c.is_sample) && <Txt size={13} color={C.warnInk}>{t("Sinov versiyasi: majmualar namuna ma'lumotlar.")}</Txt>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt muted>{t('{n} ta majmua', { n: list.length })}</Txt>
            <Pressable onPress={() => router.push('/quruvchilar')} accessibilityRole="link" hitSlop={8}>
              <Txt size={14} color={C.lapis} style={{ fontFamily: F.semi }}>{t('Quruvchilar reytingi →')}</Txt>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={<Empty title={t("Mos majmua topilmadi")} text={t("Filtrlarni o'zgartirib ko'ring.")} />}
      renderItem={({ item }) => <ComplexCard c={item} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar right={<View style={{ flexDirection: 'row', gap: 8 }}>{toggle}</View>} />
      {filters}
      {body}
    </View>
  );
}
