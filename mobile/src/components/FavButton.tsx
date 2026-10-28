import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFavorites } from '@/lib/favorites';
import { useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import type { FavType } from '@/lib/types';
import { Heart } from './icons';
import { F } from './ui';

/** Heart toggle: "icon" on cards, "button" next to a page title. */
export default function FavButton({ type, id, variant = 'icon' }: { type: FavType; id: string; variant?: 'icon' | 'button' }) {
  const { t } = useLang();
  const { has, toggle } = useFavorites();
  const on = has(type, id);

  async function press() {
    const r = await toggle(type, id);
    if (r === 'login') {
      Alert.alert(t('Kirish kerak'), t("Saqlash uchun hisobingizga kiring."), [
        { text: t('Bekor qilish'), style: 'cancel' },
        { text: t('Kirish'), onPress: () => router.push('/kirish') },
      ]);
    } else if (r === 'error') {
      Alert.alert(t("Saqlanmadi. Internetni tekshiring."));
    }
  }

  const label = on ? t('Sevimlilardan olib tashlash') : t('Sevimlilarga saqlash');
  if (variant === 'button') {
    return (
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: on ? '#E8B4B4' : C.lineStrong, backgroundColor: on ? '#FDF1F1' : C.card, alignSelf: 'flex-start' }}
      >
        <Heart filled={on} color={C.lapis} />
        <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? '#B83232' : C.lapis }}>{on ? t('Saqlangan') : t('Saqlash')}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={press} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' }}>
        <Heart filled={on} />
      </View>
    </Pressable>
  );
}
