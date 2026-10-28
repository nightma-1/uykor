import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Avatar } from '@/components/cards';
import { PhoneReveal } from '@/components/Contact';
import FavButton from '@/components/FavButton';
import ReviewForm from '@/components/ReviewForm';
import { Bar, Btn, Card, Chip, Empty, F, Fact, H1, H2, Loading, Notice, Txt } from '@/components/ui';
import { CATEGORIES, getMaster } from '@/lib/api';
import { dayMonth } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { sb, SITE } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

function Stars({ n }: { n: number }) {
  return <Text style={{ fontSize: 15, letterSpacing: 1 }}><Text style={{ color: C.star }}>{'★'.repeat(n)}</Text><Text style={{ color: C.lineStrong }}>{'★'.repeat(5 - n)}</Text></Text>;
}

export default function MasterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLang();
  const { data, loading, reload } = useLoad(() => getMaster(String(id)), [id]);

  useEffect(() => {
    if (data) sb.rpc('master_view', { mid: data.master.id }).then(() => {}, () => {});
  }, [data]);

  if (loading) return <Loading />;
  if (!data) return <Empty title={t('Usta topilmadi')} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />;
  const { master: m, photos, reviews } = data;
  const share = () => Share.share({ message: `${m.name} — ${m.categories.map((c) => t(CATEGORIES[c] ?? c)).join(', ')}\n${SITE}${lang === 'ru' ? '/ru' : ''}/usta/${m.id}` });

  return (
    <>
      <Stack.Screen options={{ title: m.name, headerRight: () => <Pressable onPress={share} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 8 }}><Txt color={C.lapis} style={{ fontFamily: F.semi }}>{t('Ulashish')}</Txt></Pressable> }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar m={m} size={80} />
            <View style={{ flex: 1, gap: 4 }}>
              <H1 size={20}>{m.name}</H1>
              <Txt size={13} muted>{[t(m.city), m.districts].filter(Boolean).join(', ')}</Txt>
              {m.review_count > 0 ? <Txt weight="bold" color={C.lapis}>★ {Number(m.rating).toFixed(1)} · {t('{n} ta sharh', { n: m.review_count })}</Txt> : <Txt size={13} muted>{t("Hali sharh yo'q")}</Txt>}
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {m.verification === 'tasdiqlangan' && <Chip kind="turq" label={t("Tekshirilgan usta: pasport ko'rilgan")} />}
            {m.categories.map((c) => <Chip key={c} kind="blue" label={t(CATEGORIES[c] ?? c)} />)}
          </View>
          <FavButton type="usta" id={m.id} variant="button" />
        </Card>

        <Card>
          <PhoneReveal kind="usta" id={m.id} />
          <Notice>{t("To'g'ridan-to'g'ri usta bilan gaplashasiz. Narx va muddatni ish boshlanishidan oldin kelishib oling. Oldindan katta to'lov bermang.")}</Notice>
        </Card>

        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          {m.experience_years != null && <Fact label={t('Tajriba')} value={t('{n} yil', { n: m.experience_years })} />}
          {m.price_note ? <Fact label={t('Narxlar')} value={m.price_note} /> : null}
          <Fact label={t('Ishlaydigan hudud')} value={m.districts || t(m.city)} />
        </Card>

        {m.description ? <Card><H2>{t('Usta haqida')}</H2><Txt>{m.description}</Txt></Card> : null}

        {photos.length > 0 && (
          <Card>
            <H2>{t('Bajarilgan ishlar')}</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={{ flexBasis: '48%', flexGrow: 1, aspectRatio: 4 / 3, borderRadius: R.md, backgroundColor: '#E1E7F0' }} contentFit="cover" accessibilityLabel={t('Bajarilgan ish')} />
              ))}
            </View>
          </Card>
        )}

        <Card>
          <H2>{t('Mijozlar sharhlari')}</H2>
          {reviews.length > 0 && (
            <View style={{ gap: 4 }}>
              {[5, 4, 3, 2, 1].map((s) => {
                const c = reviews.filter((r) => r.rating === s).length;
                return (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Txt size={13} style={{ width: 24 }}>{s}★</Txt>
                    <Bar pct={(c / reviews.length) * 100} color={C.star} height={6} />
                    <Txt size={13} muted style={{ width: 24, textAlign: 'right' }}>{c}</Txt>
                  </View>
                );
              })}
            </View>
          )}
          {reviews.length === 0 && <Txt muted>{t("Bu ustaga hali sharh yozilmagan. Birinchi bo'ling.")}</Txt>}
          {reviews.map((r) => (
            <View key={r.id} style={{ gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt weight="semi">{r.author_name}</Txt>
                <Txt size={12} muted>{dayMonth(r.created_at, lang, true)}</Txt>
              </View>
              <Stars n={r.rating} />
              <Txt color={C.grayInk}>{r.body}</Txt>
            </View>
          ))}
          <ReviewForm masterId={m.id} ownerId={m.owner_id} />
        </Card>
        <Txt size={12} muted>{t("{n} marta ko'rilgan", { n: m.views })}</Txt>
      </ScrollView>
    </>
  );
}
