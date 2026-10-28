import Constants from 'expo-constants';
import { Linking, ScrollView, View } from 'react-native';
import { Mark } from '@/components/icons';
import { Btn, Card, H1, H2, Txt, s } from '@/components/ui';
import { useLang } from '@/lib/i18n';
import { PRIVACY, PRIVACY_UPDATED } from '@/lib/privacy';
import { SITE } from '@/lib/supabase';

export default function About() {
  const { t, lang } = useLang();
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Mark size={64} />
        <H1>Uykor</H1>
        <Txt muted center>{t("Samarqanddagi yangi uylar xaritada, ijara, sotuv va ustalar. Maklersiz, komissiyasiz.")}</Txt>
        <Txt size={12} muted>{t('Versiya')} {Constants.expoConfig?.version}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn kind="tg" small title="@UykorBot" onPress={() => Linking.openURL('https://t.me/UykorBot')} style={{ flex: 1 }} />
        <Btn kind="ghost" small title="uykor.uz" onPress={() => Linking.openURL(SITE)} style={{ flex: 1 }} />
      </View>
      <Card>
        <H2>{t('Maxfiylik siyosati')}</H2>
        <Txt size={12} muted>{t('Yangilangan')}: {PRIVACY_UPDATED}</Txt>
        {PRIVACY[lang].map((x) => (
          <View key={x.h} style={{ gap: 4 }}>
            <Txt weight="semi">{x.h}</Txt>
            <Txt size={14}>{x.p}</Txt>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
