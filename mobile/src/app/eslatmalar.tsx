import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import LoginPrompt from '@/components/LoginPrompt';
import { Btn, Card, Field, H2, Notice, Seg, Txt, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { mln, som } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { sb } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Kind = 'ijara' | 'kunlik' | 'sotuv' | 'majmua';
type Alert = { id: string; kind: Kind; rooms: number | null; max_price: number | null; currency: string; district: string };

const KIND_LABEL: Record<Kind, string> = { ijara: 'Ijara', kunlik: 'Kunlik', sotuv: 'Sotuv', majmua: 'Yangi majmualar' };

export default function Alerts() {
  const { t } = useLang();
  const { session } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tg, setTg] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('ijara');
  const [rooms, setRooms] = useState(0);
  const [price, setPrice] = useState('');
  const [usd, setUsd] = useState(false);
  const [district, setDistrict] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data }, { data: tgName }] = await Promise.all([
      sb.from('alerts').select('id, kind, rooms, max_price, currency, district').eq('user_id', session.user.id).order('created_at'),
      sb.rpc('my_telegram'),
    ]);
    setAlerts((data || []) as Alert[]);
    setTg((tgName as string | null) ?? null);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!session) return <LoginPrompt text={t("Mos e'lon chiqishi bilan Telegram'ga xabar olish uchun kiring.")} />;

  const text = (a: Alert) => [
    t(KIND_LABEL[a.kind]),
    a.rooms ? (a.rooms === 4 ? t('4+ xonali') : t('{n} xonali', { n: a.rooms })) : '',
    a.max_price ? `${t('gacha')} ${a.currency === 'USD' ? `$${som(a.max_price)}` : a.kind === 'majmua' ? `${mln(a.max_price, 1)} ${t('mln/m²')}` : t("{n} mln so'm", { n: mln(a.max_price, 1) })}` : '',
    a.district,
  ].filter(Boolean).join(' · ');

  async function add() {
    setBusy(true);
    setMsg(null);
    const raw = Number(price.replace(/\s/g, '').replace(',', '.'));
    const currency = kind === 'majmua' ? 'UZS' : usd ? 'USD' : 'UZS';
    const { error } = await sb.from('alerts').insert({
      user_id: session!.user.id,
      kind,
      rooms: kind === 'majmua' || !rooms ? null : rooms,
      max_price: raw > 0 ? Math.round(currency === 'USD' ? raw : raw * 1_000_000) : null,
      currency,
      district: district.trim().slice(0, 60),
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: t("Eslatma saqlanmadi (eng ko'pi 10 ta)") }); return; }
    setMsg({ ok: true, text: t("Eslatma saqlandi. Mos e'lon chiqishi bilan Telegram'ga xabar keladi.") });
    setPrice(''); setDistrict('');
    load();
  }

  async function remove(id: string) {
    setAlerts((a) => a.filter((x) => x.id !== id));
    await sb.from('alerts').delete().eq('id', id);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        {!tg && <Notice kind="warn">{t("Eslatmalar @UykorBot orqali keladi. Ular ishlashi uchun Telegram orqali kiring yoki saytda Telegram'ni hisobingizga ulang.")}</Notice>}
        {alerts.map((a) => (
          <Card key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ flex: 1 }}>🔔 {text(a)}</Txt>
            <Btn small kind="ghost" title={t("O'chirish")} onPress={() => remove(a.id)} />
          </Card>
        ))}
        <Card>
          <H2>{t("Yangi e'lon chiqsa xabar berilsin")}</H2>
          <Seg options={(Object.keys(KIND_LABEL) as Kind[]).map((k) => ({ value: k, label: t(KIND_LABEL[k]) }))} value={kind} onChange={setKind} />
          {kind !== 'majmua' && (
            <>
              <Txt size={13} weight="medium" muted>{t('Xonalar')}</Txt>
              <Seg options={[{ value: 0, label: t("Farqi yo'q") }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4+' }]} value={rooms} onChange={setRooms} />
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field
                label={kind === 'majmua' ? t("1 m² narxi gacha, mln so'm") : usd ? t('Narx gacha, $') : t("Narx gacha, mln so'm")}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder={kind === 'majmua' ? '9' : usd ? '50000' : '4,5'}
              />
            </View>
            {kind !== 'majmua' && <Seg options={[{ value: 0, label: t('mln') }, { value: 1, label: '$' }]} value={usd ? 1 : 0} onChange={(v) => setUsd(v === 1)} />}
          </View>
          <Field label={t("Hudud yoki ko'cha (ixtiyoriy)")} value={district} onChangeText={setDistrict} maxLength={60} placeholder={t('masalan Sattepo')} />
          {msg && <Txt color={msg.ok ? C.okInk : C.danger}>{msg.text}</Txt>}
          <Btn title={t("Eslatma qo'shish")} busy={busy} onPress={add} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
