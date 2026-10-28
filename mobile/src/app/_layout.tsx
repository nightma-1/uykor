import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { Unbounded_600SemiBold, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { F } from '@/components/ui';
import { AuthProvider } from '@/lib/auth';
import { FavoritesProvider } from '@/lib/favorites';
import { LangProvider, useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Nav() {
  const { t } = useLang();
  return (
    <Stack
      screenOptions={{
        headerTintColor: C.lapis,
        headerTitleStyle: { fontFamily: F.semi, color: C.ink },
        headerStyle: { backgroundColor: C.card },
        headerShadowVisible: false,
        headerBackTitle: t('Orqaga'),
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="majmua/[slug]" options={{ title: '' }} />
      <Stack.Screen name="elon/[id]" options={{ title: '' }} />
      <Stack.Screen name="usta/[id]" options={{ title: '' }} />
      <Stack.Screen name="quruvchi/[slug]" options={{ title: '' }} />
      <Stack.Screen name="quruvchilar" options={{ title: t('Quruvchilar reytingi') }} />
      <Stack.Screen name="kirish" options={{ title: t('Kirish'), presentation: 'modal' }} />
      <Stack.Screen name="profil" options={{ title: t("Mening ma'lumotlarim") }} />
      <Stack.Screen name="eslatmalar" options={{ title: t('Eslatmalar') }} />
      <Stack.Screen name="haqida" options={{ title: t('Ilova haqida') }} />
    </Stack>
  );
}

export default function Root() {
  const [loaded, err] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Unbounded_600SemiBold, Unbounded_700Bold });

  useEffect(() => {
    if (loaded || err) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, err]);

  if (!loaded && !err) return null;

  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <FavoritesProvider>
            <StatusBar style="dark" />
            <Nav />
          </FavoritesProvider>
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
