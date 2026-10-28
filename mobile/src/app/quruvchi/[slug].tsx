import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ComplexCard } from '@/components/cards';
import { PhoneReveal } from '@/components/Contact';
import { Bar, Btn, Card, Chip, Empty, F, Fact, H1, H2, Loading, Txt } from '@/components/ui';
import { getDeveloper } from '@/lib/api';
import { delayMonths, quarter, som } from '@/lib/format';
import { loc, useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

export default function DeveloperScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { data, loading, reload } = useLoad(() => getDeveloper(String(slug)), [slug]);

  if (loading) return <Loading />;
  if (!data) return <Empty title={t('Quruvchi topilmadi')} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />;
  const { developer: d, complexes, reviews } = data;
  const building = complexes.filter((c) => c.status === 'qurilmoqda');
  const delivered = complexes.filter((c) => c.status === 'topshirilgan').sort((a, b) => (b.delivered_date || '').localeCompare(a.delivered_date || ''));
  const onTime = d.delivered_total ? Math.round((d.delivered_on_time / d.delivered_total) * 100) : 0;
  const kad = d.avg_kadastr_months != null ? Math.max(0, Math.min(100, Math.round(((12 - d.avg_kadastr_months) / 12) * 100))) : 0;
  const factors = [
    { name: t("O'z vaqtida topshirish"), share: 40, value: t('{a} / {b} uy', { a: d.delivered_on_time, b: d.delivered_total }), pct: onTime },
    { name: t('Xaridorlar bahosi'), share: 30, value: d.buyer_rating != null ? t('{r} · {n} sharh', { r: d.buyer_rating, n: d.review_count }) : t("sharh yo'q"), pct: d.buyer_rating ? Math.round((d.buyer_rating / 5) * 100) : 0 },
    { name: t('Kadastr tezligi'), share: 20, value: d.avg_kadastr_months != null ? t("o'rtacha {n} oy", { n: d.avg_kadastr_months }) : t("ma'lumot yo'q"), pct: kad },
    { name: t('Hujjatlar ochiqligi'), share: 10, value: d.docs_open ? t("to'liq") : t('ochilmagan'), pct: d.docs_open ? 100 : 0 },
  ];
  const cards = (list: typeof complexes) => list.map((c) => <ComplexCard key={c.id} c={{ ...c, developer: { slug: d.slug, name: d.name, initials: d.initials, rating: Number(d.rating) } }} />);

  return (
    <>
      <Stack.Screen options={{ title: d.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {d.is_sample && <Txt size={13} color={C.warnInk}>{t("Sinov versiyasi: bu sahifadagi ma'lumotlar namuna.")}</Txt>}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Txt color="#fff" size={24} style={{ fontFamily: F.bold }}>{d.initials}</Txt>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {d.verified && <Chip kind="turq" label={t('Tekshirilgan quruvchi')} />}
              <H1 size={20}>{d.name}</H1>
              <Txt size={13} muted>{t(d.city)}{d.founded_year ? ` · ${t('{n}-yildan beri', { n: d.founded_year })}` : ''}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Txt size={40} color={C.lapis} style={{ fontFamily: F.bold, lineHeight: 46 }}>{Number(d.rating).toFixed(1)}</Txt>
            <Txt size={13} muted>{t('Uykor reytingi, 5 dan')}</Txt>
          </View>
          {loc(d, 'description', lang) ? <Txt>{loc(d, 'description', lang)}</Txt> : null}
          {d.phone ? <PhoneReveal kind="quruvchi" id={d.id} /> : null}
        </Card>

        <Card>
          <H2>{t('Reyting qanday hisoblangan')}</H2>
          <Txt size={14} muted>{t("Reytingni pulga sotib bo'lmaydi. U faqat to'rtta faktdan tuziladi, har birining ulushi ko'rsatilgan.")}</Txt>
          {factors.map((f) => (
            <View key={f.name} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt size={14} weight="semi" style={{ flex: 1 }}>{f.name} <Txt size={14} muted>· {f.share}%</Txt></Txt>
                <Txt size={14} weight="bold">{f.value}</Txt>
              </View>
              <View style={{ flexDirection: 'row' }}><Bar pct={f.pct} color={C.lapis} /></View>
            </View>
          ))}
        </Card>

        <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          <Fact label={t('Topshirgan')} value={t('{n} ta uy', { n: d.delivered_total })} />
          <Fact label={t('Qurilmoqda')} value={t('{n} ta', { n: d.building_now })} />
          <Fact label={t('Sotilgan')} value={som(d.sold_units)} />
          <Fact label={t("O'z vaqtida")} value={`${onTime}%`} />
        </Card>

        {building.length > 0 && <H2>{t('Qurilayotgan majmualar')}</H2>}
        {cards(building)}

        {delivered.length > 0 && (
          <Card>
            <H2>{t("Va'da va haqiqat")}</H2>
            {delivered.map((c) => {
              const late = delayMonths(c.promised_date, c.delivered_date);
              return (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
                  <View style={{ flex: 1 }}>
                    <Txt weight="semi">{c.name}</Txt>
                    <Txt size={12} muted>{t("Va'da")}: {quarter(c.promised_date, lang)} · {t('Topshirildi')}: {quarter(c.delivered_date, lang)}</Txt>
                  </View>
                  {late > 0 ? <Chip kind="warn" label={t('{n} oy kechikdi', { n: late })} /> : <Chip kind="ok" label={t("O'z vaqtida")} />}
                </View>
              );
            })}
          </Card>
        )}

        <Card>
          <H2>{t('Xaridorlar sharhlari')}</H2>
          <Txt size={13} muted>{t('Faqat shartnomasi tekshirilgan xaridorlar yoza oladi')}</Txt>
          {reviews.length === 0 && <Txt muted>{t("Hozircha sharh yo'q.")}</Txt>}
          {reviews.map((r) => (
            <View key={r.id} style={{ gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt weight="semi">{r.author_name}</Txt>
                <Txt weight="bold" color={C.lapis}>★ {r.rating}</Txt>
              </View>
              {r.verified && <Txt size={12} color={C.turqInk} weight="semi">{t('Tasdiqlangan xaridor')}{r.complex ? ` · ${r.complex.name}` : ''}</Txt>}
              <Txt size={14} color={C.grayInk}>{r.body}</Txt>
            </View>
          ))}
        </Card>
      </ScrollView>
    </>
  );
}
