import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { sb } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { Btn, Field, Notice, Txt } from './ui';

/** "Book a viewing" / "Request a call": goes straight to the developer. */
export default function LeadForm({ complexId }: { complexId: string }) {
  const { t } = useLang();
  const { profile } = useAuth();
  const [name, setName] = useState(() => profile?.full_name || '');
  const [phone, setPhone] = useState(() => profile?.phone || '+998 ');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');

  async function send(kind: 'korish' | 'qongiroq') {
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) { setErr(t('Ismingizni yozing.')); return; }
    if (digits.length < 9) { setErr(t("Telefon raqamni to'liq yozing, masalan +998 90 123 45 67.")); return; }
    setErr('');
    setState('sending');
    const { error } = await sb.from('leads').insert({ complex_id: complexId, name: name.trim().slice(0, 80), phone: phone.trim().slice(0, 20), kind });
    if (error) { setState('idle'); setErr(t("Ariza yuborilmadi. Internetni tekshirib, qayta urinib ko'ring.")); return; }
    setState('done');
  }

  if (state === 'done') return <Notice kind="ok">{t("Arizangiz quruvchiga yuborildi. Tez orada siz bilan bog'lanishadi.")}</Notice>;

  return (
    <View style={{ gap: 10 }}>
      <Field label={t('Ismingiz')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} />
      <Field label={t('Telefon raqam')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={20} />
      {err ? <Txt color={C.danger} accessibilityRole="alert">{err}</Txt> : null}
      <Btn title={t("Ko'rishga yozilish")} busy={state === 'sending'} onPress={() => send('korish')} />
      <Btn kind="ghost" title={t("Qo'ng'iroq so'rash")} disabled={state === 'sending'} onPress={() => send('qongiroq')} />
      <Notice>{t("Ariza to'g'ridan-to'g'ri quruvchiga boradi. Makler yo'q, komissiya yo'q.")}</Notice>
    </View>
  );
}
