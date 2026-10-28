import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { PhoneReveal, ReportListing } from '@/components/Contact';
import FavButton from '@/components/FavButton';
import Gallery from '@/components/Gallery';
import MapView from '@/components/MapView';
import { Btn, Card, Chip, Empty, F, Fact, H1, H2, Loading, Notice, Txt } from '@/components/ui';
import { getListing } from '@/lib/api';
import { dayMonth, priceShort, priceText } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { sb, SITE } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLang();
  const { data: l, loading, reload } = useLoad(() => getListing(String(id)), [id]);

  useEffect(() => {
    if (l) sb.rpc('listing_view', { lid: l.id }).then(() => {}, () => {});
  }, [l]);

  if (loading) return <Loading />;
  if (!l) return <Empty title={t("E'lon topilmadi yoki olib tashlangan")} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />;

  const share = () => Share.share({ message: `${l.title} — ${priceText(l, lang)}\n${SITE}${lang === 'ru' ? '/ru' : ''}/elon/${l.id}` });
  const date = dayMonth(l.published_at || l.created_at, lang);

  return (
    <>
      <Stack.Screen options={{ title: '', headerRight: () => <Pressable onPress={share} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 8 }}><Txt color={C.lapis} style={{ fontFamily: F.semi }}>{t('Ulashish')}</Txt></Pressable> }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Gallery photos={l.listing_photos} empty={t("Rasm qo'shilmagan")} />
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {l.verification === 'tasdiqlangan' && <Chip kind="turq" label={l.poster_type === 'quruvchi' ? t('Quruvchidan, hujjatlari tekshirilgan') : t('Egasi hujjat bilan tekshirilgan')} />}
              <Chip label={t('Komissiyasiz')} />
            </View>
            <Txt size={24} weight="bold">{priceText(l, lang)}</Txt>
            <H1 size={20}>{l.title}</H1>
            <Txt muted>{[t(l.city), l.district, l.address].filter(Boolean).join(', ')}</Txt>
            <FavButton type="elon" id={l.id} variant="button" />
          </View>

          <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
            {l.rooms ? <Fact label={t('Xonalar')} value={String(l.rooms)} /> : null}
            {l.area ? <Fact label={t('Maydon')} value={`${l.area} m²`} /> : null}
            {l.floor ? <Fact label={t('Qavat')} value={l.floors_total ? `${l.floor} / ${l.floors_total}` : String(l.floor)} /> : null}
            <Fact label={t('Joylangan')} value={date} />
          </Card>

          <Card>
            <PhoneReveal kind="elon" id={l.id} name={l.contact_name} />
            <Notice>{t("To'g'ridan-to'g'ri egasi bilan gaplashasiz. Uyni ko'rmasdan oldindan pul o'tkazmang.")}</Notice>
          </Card>

          {l.description ? (
            <Card>
              <H2>{t('Tavsif')}</H2>
              <Txt>{l.description}</Txt>
            </Card>
          ) : null}

          {l.lat != null && l.lng != null && (
            <MapView points={[{ id: l.id, lat: l.lat, lng: l.lng, label: priceShort(l, lang), title: l.title }]} selectedId={l.id} zoom={15} style={{ height: 220, borderRadius: R.lg }} />
          )}

          <ReportListing id={l.id} />
          <Txt size={12} muted>{t("{n} marta ko'rilgan", { n: l.views })}</Txt>
        </View>
      </ScrollView>
    </>
  );
}
