import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CATEGORIES } from '@/lib/api';
import { dueLabel, minPrice, mln, priceText, roomsText } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { C, R } from '@/lib/theme';
import type { ComplexCard as CX, Listing, Master } from '@/lib/types';
import FavButton from './FavButton';
import { Bar, Chip, F, Txt, s } from './ui';

export function Thumb({ uri, w, h, radius = R.md, label }: { uri?: string | null; w: number | `${number}%`; h: number; radius?: number; label?: string }) {
  return (
    <View style={{ width: w, height: h, borderRadius: radius, backgroundColor: C.placeholder, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} accessibilityIgnoresInvertColors /> : label ? <Txt size={12} color="#3D4F78">{label}</Txt> : null}
    </View>
  );
}

export function ComplexCard({ c, selected, onPress }: { c: CX; selected?: boolean; onPress?: () => void }) {
  const { t, lang } = useLang();
  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/majmua/${c.slug}`))}
      accessibilityRole="link"
      accessibilityLabel={c.name}
      style={({ pressed }) => [s.card, { padding: 12, flexDirection: 'row', gap: 12, opacity: pressed ? 0.9 : 1 }, selected && { borderColor: C.lapis, borderWidth: 2, padding: 11 }]}
    >
      <Thumb uri={c.cover_url} w={104} h={124} />
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Txt weight="bold" size={16} numberOfLines={2} style={{ flex: 1 }}>{c.name}</Txt>
          <FavButton type="majmua" id={c.id} />
        </View>
        <Txt size={13} muted numberOfLines={1}>{c.district} · {c.developer.name}</Txt>
        <Txt weight="bold" size={16}>{t("{n} mln so'mdan", { n: mln(minPrice(c)) })}</Txt>
        <Txt size={13} muted>{mln(c.price_m2, 1)} {t('mln/m²')} · {dueLabel(c, lang)}</Txt>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {c.developer.rating > 0 && <Chip kind="blue" label={`★ ${c.developer.rating.toFixed(1)}`} />}
          {c.installment_months > 0 && <Chip kind="turq" label={t('{n} oy rassrochka', { n: c.installment_months })} />}
          {c.kadastr_status === 'bor' && <Chip kind="ok" label={t('Kadastr bor')} />}
        </View>
        {c.status === 'qurilmoqda' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Bar pct={c.progress} height={6} />
            <Txt size={12} muted>{c.progress}%</Txt>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function ListingCard({ l }: { l: Listing }) {
  const { t, lang } = useLang();
  return (
    <Pressable onPress={() => router.push(`/elon/${l.id}`)} accessibilityRole="link" accessibilityLabel={l.title} style={({ pressed }) => [s.card, { overflow: 'hidden', opacity: pressed ? 0.9 : 1 }]}>
      <View>
        <Thumb uri={l.listing_photos[0]?.url} w="100%" h={180} radius={0} label={t("Rasm qo'shilmagan")} />
        <View style={{ position: 'absolute', top: 10, right: 10 }}><FavButton type="elon" id={l.id} /></View>
        {l.listing_photos.length > 1 && (
          <View style={{ position: 'absolute', bottom: 10, left: 10 }}><Chip label={t('{n} ta rasm', { n: l.listing_photos.length })} /></View>
        )}
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <Txt weight="bold" size={18}>{priceText(l, lang)}</Txt>
        <Txt weight="semi" numberOfLines={2}>{l.title}</Txt>
        <Txt size={13} muted numberOfLines={1}>{[roomsText(l, lang), l.district].filter(Boolean).join(' · ')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {l.verification === 'tasdiqlangan' && <Chip kind="turq" label={l.poster_type === 'quruvchi' ? t('Quruvchidan') : t('Egasi tekshirilgan')} />}
          <Chip label={t('Komissiyasiz')} />
        </View>
      </View>
    </Pressable>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Avatar({ m, size = 56 }: { m: Pick<Master, 'name' | 'avatar_url'>; size?: number }) {
  if (m.avatar_url) return <Thumb uri={m.avatar_url} w={size} h={size} radius={size / 2} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.lapisSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Txt weight="bold" size={size / 2.8} color={C.lapis}>{initials(m.name)}</Txt>
    </View>
  );
}

export function MasterCard({ m }: { m: Master }) {
  const { t } = useLang();
  return (
    <Pressable onPress={() => router.push(`/usta/${m.id}`)} accessibilityRole="link" accessibilityLabel={m.name} style={({ pressed }) => [s.card, { padding: 14, gap: 10, opacity: pressed ? 0.9 : 1 }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar m={m} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt weight="bold" size={16} numberOfLines={1}>{m.name}</Txt>
          <Txt size={13} muted numberOfLines={1}>{m.categories.slice(0, 2).map((c) => t(CATEGORIES[c] ?? c)).join(', ')}</Txt>
          <Txt size={13} color={m.review_count ? C.ink : C.muted} style={{ fontFamily: m.review_count ? F.semi : F.body }}>
            {m.review_count ? `★ ${Number(m.rating).toFixed(1)} · ${t('{n} sharh', { n: m.review_count })}` : t("Hali sharh yo'q")}
          </Txt>
        </View>
        <FavButton type="usta" id={m.id} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {m.verification === 'tasdiqlangan' && <Chip kind="turq" label={t('Tekshirilgan usta')} />}
        {m.experience_years != null && <Chip label={t('{n} yil tajriba', { n: m.experience_years })} />}
        {m.price_note ? <Chip kind="blue" label={m.price_note} /> : null}
      </View>
    </Pressable>
  );
}
