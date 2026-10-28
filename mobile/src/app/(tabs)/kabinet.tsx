import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import LoginPrompt from '@/components/LoginPrompt';
import { LangSwitch } from '@/components/TopBar';
import { Btn, Card, Chip, H2, Txt, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { priceText } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { FN, sb, SITE } from '@/lib/supabase';
import { C } from '@/lib/theme';
import type { Listing } from '@/lib/types';

const STATUS: Record<Listing['status'], { label: string; kind: 'gray' | 'warn' | 'ok' }> = {
  qoralama: { label: 'Qoralama', kind: 'gray' },
  moderatsiya: { label: 'Tekshiruvda', kind: 'warn' },
  faol: { label: 'Saytda', kind: 'ok' },
  rad: { label: 'Rad etildi', kind: 'warn' },
  arxiv: { label: 'Arxivda', kind: 'gray' },
};

type Mine = {
  listings: Pick<Listing, 'id' | 'kind' | 'title' | 'price' | 'currency' | 'status' | 'reject_reason' | 'views'>[];
  master: { id: string; name: string; status: Listing['status']; views: number } | null;
  tg: string | null;
};

function Row({ title, sub, onPress }: { title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="semi">{title}</Txt>
        {sub ? <Txt size={13} muted>{sub}</Txt> : null}
      </View>
      <Txt muted size={20}>›</Txt>
    </Pressable>
  );
}

export default function Kabinet() {
  const { t, lang } = useLang();
  const { session, profile, signOut } = useAuth();
  const [mine, setMine] = useState<Mine | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const uid = session?.user.id;
  const web = (path: string) => WebBrowser.openBrowserAsync(`${SITE}${path}`);

  const load = useCallback(async () => {
    if (!uid) return;
    const [{ data: listings }, { data: master }, { data: tg }] = await Promise.all([
      sb.from('listings').select('id, kind, title, price, currency, status, reject_reason, views').eq('owner_id', uid).order('updated_at', { ascending: false }),
      sb.from('masters').select('id, name, status, views').eq('owner_id', uid).maybeSingle(),
      sb.rpc('my_telegram'),
    ]);
    setMine({ listings: (listings || []) as Mine['listings'], master: master as Mine['master'], tg: (tg as string | null) ?? null });
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = () =>
    Alert.alert(
      t("Hisobni o'chirish"),
      t("Hisobingiz, e'lonlaringiz, usta profilingiz, sevimlilar va eslatmalar butunlay o'chiriladi. Buni qaytarib bo'lmaydi."),
      [
        { text: t('Bekor qilish'), style: 'cancel' },
        { text: t("O'chirish"), style: 'destructive', onPress: deleteAccount },
      ],
    );

  async function deleteAccount() {
    setDeleting(true);
    try {
      const { data } = await sb.auth.getSession();
      const r = await fetch(FN('delete-account'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!r.ok) throw new Error(String(r.status));
      await signOut();
      Alert.alert(t("Hisobingiz o'chirildi."));
    } catch {
      Alert.alert(t("Hisobni o'chirib bo'lmadi. Keyinroq qayta urinib ko'ring yoki @UykorBot'ga yozing."));
    } finally {
      setDeleting(false);
    }
  }

  const footer = (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt weight="semi">{t('Til')}</Txt>
        <LangSwitch />
      </View>
      <Row title={t('Ilova haqida')} sub={t('Maxfiylik siyosati, aloqa')} onPress={() => router.push('/haqida')} />
    </Card>
  );

  if (!session) {
    return (
      <ScrollView contentContainerStyle={s.screen}>
        <LoginPrompt text={t("Telegram orqali bir bosishda kiring: sevimlilar, eslatmalar va e'lonlaringiz shu yerda bo'ladi.")} />
        {footer}
      </ScrollView>
    );
  }

  const tgUser = session.user.email?.endsWith('@telegram.uykor.uz');
  const who = tgUser ? `Telegram${session.user.user_metadata?.tg_username ? ` · @${session.user.user_metadata.tg_username}` : ''}` : session.user.email ?? '';
  const needProfile = !profile?.full_name || !profile?.phone;

  return (
    <ScrollView contentContainerStyle={s.screen} refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.lapis} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Card>
        <View style={{ gap: 2 }}>
          <Txt size={18} weight="bold">{profile?.full_name || t('Ismsiz foydalanuvchi')}</Txt>
          <Txt size={13} muted>{[who, profile?.phone].filter(Boolean).join(' · ')}</Txt>
        </View>
        {needProfile && <Chip kind="warn" label={t("Ism va telefonni kiriting")} />}
        <Btn small kind="ghost" title={t("Ma'lumotlarni tahrirlash")} onPress={() => router.push('/profil')} style={{ alignSelf: 'flex-start' }} />
      </Card>

      <Card>
        <H2>Telegram</H2>
        <Txt size={14} muted>
          {mine?.tg
            ? `${t('Ulangan')}${mine.tg !== 'ulangan' ? `: @${mine.tg}` : ''}. ${t("Narx tushsa yoki mos yangi e'lon chiqsa, @UykorBot xabar beradi.")}`
            : t("Eslatmalar @UykorBot orqali keladi. Telegram orqali kirsangiz, avtomatik ulanadi.")}
        </Txt>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H2>{t("Mening e'lonlarim")}</H2>
          <Btn small title={t("+ E'lon")} onPress={() => web('/kabinet/elon/yangi')} />
        </View>
        {(mine?.listings || []).length === 0 ? (
          <Txt muted>{t("Hali e'lon yo'q. E'lon joylash bepul; tekshiruvdan keyin ilovada va saytda chiqadi.")}</Txt>
        ) : (
          mine!.listings.map((l) => (
            <Pressable key={l.id} onPress={() => (l.status === 'faol' ? router.push(`/elon/${l.id}`) : web(`/kabinet/elon/${l.id}`))} accessibilityRole="button" style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt weight="semi" style={{ flex: 1 }} numberOfLines={1}>{l.title}</Txt>
                <Chip kind={STATUS[l.status].kind} label={t(STATUS[l.status].label)} />
              </View>
              <Txt size={13} muted>{priceText(l, lang)} · {t("{n} ko'rish", { n: l.views })}</Txt>
              {l.status === 'rad' && l.reject_reason ? <Txt size={13} color={C.danger}>{t('Rad sababi')}: {l.reject_reason}</Txt> : null}
            </Pressable>
          ))
        )}
        <Txt size={12} muted>{t("E'lonni tahrirlash va hujjatlarni yuklash hozircha uykor.uz saytida.")}</Txt>
      </Card>

      <Card pad={16} style={{ gap: 0 }}>
        <Row
          title={t('Usta profili')}
          sub={mine?.master ? `${mine.master.name} · ${t(STATUS[mine.master.status].label)}` : t("Ta'mir, santexnika, elektrika kabi ishlarni qilsangiz")}
          onPress={() => (mine?.master?.status === 'faol' ? router.push(`/usta/${mine.master.id}`) : web('/kabinet/usta'))}
        />
        <Row title={t('Quruvchilar uchun')} sub={t('Majmualar, narxlar va xaridorlar arizalari')} onPress={() => web('/kabinet/quruvchi')} />
        <Row title={`🔔 ${t('Eslatmalar')}`} onPress={() => router.push('/eslatmalar')} />
      </Card>

      {footer}

      <Btn kind="ghost" title={t('Chiqish')} onPress={signOut} />
      <Btn kind="danger" title={t("Hisobni o'chirish")} busy={deleting} onPress={confirmDelete} />
    </ScrollView>
  );
}
