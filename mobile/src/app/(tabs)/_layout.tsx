import { Tabs } from 'expo-router';
import { Heart, IconBuilding, IconKey, IconTool, IconUser } from '@/components/icons';
import { F } from '@/components/ui';
import { useLang } from '@/lib/i18n';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  const { t } = useLang();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.lapis,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11, lineHeight: 14 },
        tabBarStyle: { borderTopColor: C.line },
        headerTitleStyle: { fontFamily: F.semi, color: C.ink },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Yangi uylar'), headerShown: false, tabBarIcon: ({ color }) => <IconBuilding color={String(color)} /> }} />
      <Tabs.Screen name="elonlar" options={{ title: t("E'lonlar"), headerShown: false, tabBarIcon: ({ color }) => <IconKey color={String(color)} /> }} />
      <Tabs.Screen name="ustalar" options={{ title: t('Ustalar'), headerShown: false, tabBarIcon: ({ color }) => <IconTool color={String(color)} /> }} />
      <Tabs.Screen name="saqlangan" options={{ title: t('Saqlangan'), tabBarIcon: ({ color }) => <Heart size={24} color={String(color)} /> }} />
      <Tabs.Screen name="kabinet" options={{ title: t('Kabinet'), tabBarIcon: ({ color }) => <IconUser color={String(color)} /> }} />
    </Tabs>
  );
}
