import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang, type Lang } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { Mark } from './icons';
import { F, H1 } from './ui';

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Til / Язык" style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.lineStrong, borderRadius: 10, overflow: 'hidden' }}>
      {(['uz', 'ru'] as Lang[]).map((l) => (
        <Pressable
          key={l}
          onPress={() => setLang(l)}
          accessibilityRole="radio"
          accessibilityState={{ checked: lang === l }}
          style={{ minHeight: 36, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: lang === l ? C.lapis : C.card }}
        >
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: lang === l ? '#fff' : C.muted }}>{l.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Brand header used on the main tabs. */
export default function TopBar({ title, right }: { title?: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Mark size={30} />
      <H1 size={title ? 19 : 21} style={{ flex: 1 }}>{title ?? 'Uykor'}</H1>
      {right ?? <LangSwitch />}
    </View>
  );
}
