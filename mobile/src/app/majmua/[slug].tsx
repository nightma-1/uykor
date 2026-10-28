import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, ScrollView, View } from 'react-native';
import Calculator from '@/components/Calculator';
import FavButton from '@/components/FavButton';
import Gallery from '@/components/Gallery';
import LeadForm from '@/components/LeadForm';
import MapView from '@/components/MapView';
import { Bar, Btn, Card, Chip, Empty, F, Fact, H1, H2, Loading, Txt } from '@/components/ui';
import { getComplex } from '@/lib/api';
import { delayMonths, dueLabel, minPrice, mln, monthYear, quarter, som } from '@/lib/format';
import { loc, useLang } from '@/lib/i18n';
import { SITE } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { useLoad } from '@/lib/useLoad';

function dist(m: number, lang: 'uz' | 'ru') {
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace('.', ',')} ${lang === 'ru' ? 'км' : 'km'}`;
  return `${m} ${lang === 'ru' ? 'м' : 'm'}`;
}

export default function ComplexScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { data, loading, reload } = useLoad(() => getComplex(String(slug)), [slug]);

  if (loading) return <Loading />;
  if (!data) return <Empty title={t('Majmua topilmadi')} action={<Btn title={t('Qayta urinish')} onPress={reload} />} />;

  const { complex: c, developer: d, history } = data;
  const rooms = c.unit_types.map((u) => u.rooms);
  const photos = [...(c.cover_url ? [{ id: 'cover', url: c.cover_url, caption: c.name }] : []), ...c.complex_photos];
  const share = () => Share.share({ message: `${c.name} — ${t("{n} mln so'mdan", { n: mln(minPrice(c)) })}\n${SITE}${lang === 'ru' ? '/ru' : ''}/jk/${c.slug}` });

  return (
    <>
      <Stack.Screen options={{ title: c.name, headerRight: () => <Pressable onPress={share} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 8 }}><Txt color={C.lapis} style={{ fontFamily: F.semi }}>{t('Ulashish')}</Txt></Pressable> }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {c.is_sample && <View style={{ backgroundColor: C.warnBg, padding: 8 }}><Txt size={13} color={C.warnInk} center>{t("Sinov versiyasi: bu sahifadagi ma'lumotlar namuna.")}</Txt></View>}
        <Gallery photos={photos} empty={t('Majmua rasmlari tez orada')} />
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {c.docs_verified && <Chip kind="turq" label={t('Hujjatlar tekshirilgan')} />}
              {c.kadastr_status === 'bor' ? <Chip kind="ok" label={t('Kadastr chiqqan')} /> : <Chip kind="warn" label={t('Kadastr jarayonda')} />}
              {c.status === 'topshirilgan' && <Chip label={t('Topshirilgan')} />}
            </View>
            <H1>{c.name}</H1>
            <Txt muted>
              {t(c.city)}, {c.address}
              {c.blocks ? ` · ${t('{n} blok', { n: c.blocks })}` : ''}{c.floors ? `, ${t('{n} qavat', { n: c.floors })}` : ''}
              {rooms.length ? ` · ${t('{n} xonali', { n: `${Math.min(...rooms)}–${Math.max(...rooms)}` })}` : ''}
            </Txt>
            <FavButton type="majmua" id={c.id} variant="button" />
          </View>

          <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
            <Fact label={t('1 m² narxi')} value={t("{n} mln so'm", { n: mln(c.price_m2, 1) })} />
            <Fact label={t("Bo'lib to'lash")} value={c.installment_months ? t('{n} oygacha', { n: c.installment_months }) : t("Yo'q")} sub={c.installment_months ? t("boshlang'ich {n}% dan", { n: c.first_payment_pct }) : undefined} />
            <Fact label={t('Topshirish')} value={dueLabel(c, lang)} sub={c.status === 'topshirilgan' && c.delivered_date ? monthYear(c.delivered_date, lang) : undefined} />
            <Fact label={t('Kadastr')} value={c.kadastr_status === 'bor' ? t('Chiqqan') : t('Jarayonda')} sub={d?.avg_kadastr_months && c.kadastr_status !== 'bor' ? t("quruvchida o'rtacha ~{n} oy", { n: d.avg_kadastr_months }) : undefined} />
          </Card>

          <Card>
            <Txt size={13} muted>{t('Narxi')}</Txt>
            <Txt size={24} weight="bold">{t("{n} mln so'mdan", { n: mln(minPrice(c)) })}</Txt>
            <LeadForm complexId={c.id} />
          </Card>

          {loc(c, 'description', lang) ? <Txt>{loc(c, 'description', lang)}</Txt> : null}

          {c.status === 'qurilmoqda' && (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <H2>{t('Qurilish jarayoni')}</H2>
                <Txt weight="bold" color={C.turqInk}>{t('{n}% bajarilgan', { n: c.progress })}</Txt>
              </View>
              <View style={{ flexDirection: 'row' }}><Bar pct={c.progress} height={10} /></View>
              {c.progress_updates.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {c.progress_updates.map((p) => (
                    <View key={p.id} style={{ width: 140, gap: 4 }}>
                      <View style={{ height: 90, borderRadius: R.md, backgroundColor: '#E1E7F0', overflow: 'hidden' }}>
                        {p.photo_url ? <Image source={{ uri: p.photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={loc(p, 'title', lang)} /> : null}
                      </View>
                      <Txt size={13} weight="bold">{monthYear(p.month, lang)}</Txt>
                      <Txt size={12} muted>{loc(p, 'title', lang)}</Txt>
                    </View>
                  ))}
                </ScrollView>
              )}
            </Card>
          )}

          <Calculator units={c.unit_types} priceM2={c.price_m2} maxMonths={c.installment_months} minFirstPct={c.first_payment_pct} />

          {c.unit_types.length > 0 && (
            <Card>
              <H2>{t('Xonadon turlari')}</H2>
              {c.unit_types.map((u) => (
                <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }}>
                  <Txt weight="semi">{t('{n} xonali', { n: u.rooms })} · {u.area} m²</Txt>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt weight="bold">{som(u.price ?? u.area * c.price_m2)} {t("so'm")}</Txt>
                    {u.available != null && <Txt size={12} muted>{t("{n} ta bo'sh", { n: u.available })}</Txt>}
                  </View>
                </View>
              ))}
            </Card>
          )}

          {c.nearby.length > 0 && (
            <Card>
              <H2>{t('Atrofida')}</H2>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
                {[...c.nearby].sort((a, b) => a.distance_m - b.distance_m).map((n) => (
                  <View key={n.id} style={{ flexBasis: '33%' }}>
                    <Txt weight="semi">{t(n.kind)}</Txt>
                    <Txt size={13} muted>{dist(n.distance_m, lang)}</Txt>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <MapView points={[{ id: c.id, lat: c.lat, lng: c.lng, label: c.name, title: c.name }]} selectedId={c.id} zoom={15} style={{ height: 220, borderRadius: R.lg }} />

          {d && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt color="#fff" weight="bold" size={17}>{d.initials}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={12} muted>{t('Quruvchi')}</Txt>
                  <H2>{d.name}</H2>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt size={26} color={C.lapis} style={{ fontFamily: F.bold }}>{Number(d.rating).toFixed(1)}</Txt>
                  <Txt size={11} muted>{t('reyting, 5 dan')}</Txt>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
                <Fact label={t('Topshirgan')} value={t('{n} ta uy', { n: d.delivered_total })} />
                <Fact label={t("O'z vaqtida")} value={`${d.delivered_on_time} / ${d.delivered_total}`} />
                <Fact label={t('Qurilmoqda')} value={t('{n} ta', { n: d.building_now })} />
                <Fact label={t('Sotilgan')} value={som(d.sold_units)} />
              </View>
              {history.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Txt weight="semi">{t("Va'da va haqiqat")}</Txt>
                  {history.map((h) => {
                    const late = delayMonths(h.promised_date, h.delivered_date);
                    return (
                      <View key={h.slug} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Txt size={14} weight="semi">{h.name}</Txt>
                          <Txt size={12} muted>{quarter(h.promised_date, lang)} → {quarter(h.delivered_date, lang)}</Txt>
                        </View>
                        {late > 0 ? <Chip kind="warn" label={t('{n} oy kechikdi', { n: late })} /> : <Chip kind="ok" label={t("O'z vaqtida")} />}
                      </View>
                    );
                  })}
                </View>
              )}
              <Btn kind="ghost" small title={t('Quruvchi profili →')} onPress={() => router.push(`/quruvchi/${d.slug}`)} style={{ alignSelf: 'flex-start' }} />
            </Card>
          )}
        </View>
      </ScrollView>
    </>
  );
}
