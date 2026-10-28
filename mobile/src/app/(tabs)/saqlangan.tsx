import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { ComplexCard, ListingCard, MasterCard } from '@/components/cards';
import LoginPrompt from '@/components/LoginPrompt';
import { Btn, Card, Empty, H2, Loading, Txt, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/favorites';
import { useLang } from '@/lib/i18n';
import { sb } from '@/lib/supabase';
import { C } from '@/lib/theme';
import type { ComplexCard as CX, Listing, Master } from '@/lib/types';

type Data = { complexes: CX[]; listings: Listing[]; masters: Master[] };

export default function Saved() {
  const { t } = useLang();
  const { session, ready } = useAuth();
  const { keys, refresh: refreshKeys } = useFavorites();
  const [data, setData] = useState<Data | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const ids = (type: string) => [...keys].filter((k) => k.startsWith(`${type}:`)).map((k) => k.slice(type.length + 1));
    const [cx, ls, ms] = await Promise.all([
      ids('majmua').length ? sb.from('complexes').select('*, unit_types(*), developer:developers(slug, name, initials)').in('id', ids('majmua')).eq('published', true) : Promise.resolve({ data: [] }),
      ids('elon').length ? sb.from('listings').select('*, listing_photos(id, url, sort)').in('id', ids('elon')).eq('status', 'faol') : Promise.resolve({ data: [] }),
      ids('usta').length ? sb.from('master_stats').select('*').in('id', ids('usta')).eq('status', 'faol') : Promise.resolve({ data: [] }),
    ]);
    setData({
      complexes: ((cx.data || []) as CX[]).map((c) => ({ ...c, developer: { ...c.developer, rating: 0 } })),
      listings: ((ls.data || []) as Listing[]).map((l) => ({ ...l, listing_photos: [...l.listing_photos].sort((a, b) => a.sort - b.sort) })),
      masters: (ms.data || []) as Master[],
    });
  }, [keys]);

  useFocusEffect(useCallback(() => { if (session) load(); }, [session, load]));

  if (!ready) return <Loading />;
  if (!session) return <LoginPrompt text={t("Yoqqan uylar, e'lonlar va ustalarni saqlang, narx tushsa Telegram'da xabar oling.")} />;

  const total = data ? data.complexes.length + data.listings.length + data.masters.length : 0;

  return (
    <ScrollView
      contentContainerStyle={s.screen}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.lapis} onRefresh={async () => { setRefreshing(true); await refreshKeys(); await load(); setRefreshing(false); }} />}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="semi">🔔 {t('Eslatmalar')}</Txt>
          <Txt size={13} muted>{t("Mos yangi e'lon chiqsa, @UykorBot xabar beradi.")}</Txt>
        </View>
        <Btn small kind="ghost" title={t('Ochish')} onPress={() => router.push('/eslatmalar')} />
      </Card>
      {!data ? (
        <Loading />
      ) : total === 0 ? (
        <Empty title={t("Hali hech narsa saqlanmagan")} text={t("Majmua, e'lon yoki usta sahifasidagi ♥ tugmasini bosing.")} action={<Btn title={t("Uylarni ko'rish")} onPress={() => router.navigate('/')} />} />
      ) : (
        <>
          {data.complexes.length > 0 && <H2>{t('Majmualar')}</H2>}
          {data.complexes.map((c) => <ComplexCard key={c.id} c={c} />)}
          {data.listings.length > 0 && <H2>{t("E'lonlar")}</H2>}
          {data.listings.map((l) => <ListingCard key={l.id} l={l} />)}
          {data.masters.length > 0 && <H2>{t('Ustalar')}</H2>}
          {data.masters.map((m) => <MasterCard key={m.id} m={m} />)}
        </>
      )}
    </ScrollView>
  );
}
