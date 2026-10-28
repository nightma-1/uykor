import { router } from 'expo-router';
import { View } from 'react-native';
import { useLang } from '@/lib/i18n';
import { Mark } from './icons';
import { Btn, Txt } from './ui';

export default function LoginPrompt({ text }: { text: string }) {
  const { t } = useLang();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 14 }}>
      <Mark size={56} />
      <Txt size={17} weight="semi" center>{t('Hisobingizga kiring')}</Txt>
      <Txt muted center>{text}</Txt>
      <Btn title={t('Kirish')} onPress={() => router.push('/kirish')} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
