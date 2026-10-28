import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import LoginPrompt from '@/components/LoginPrompt';
import { Btn, Field, Notice, Seg, Txt, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { sb } from '@/lib/supabase';
import { C } from '@/lib/theme';

export default function ProfileEdit() {
  const { t } = useLang();
  const { session, profile } = useAuth();
  if (!session) return <LoginPrompt text={t("Ma'lumotlaringizni saqlash uchun kiring.")} />;
  // Re-mount the form once the profile arrives so it starts from the saved values.
  return <Form key={profile?.id ?? 'new'} />;
}

function Form() {
  const { t } = useLang();
  const { session, profile, reloadProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '+998 ');
  const [type, setType] = useState<'ega' | 'quruvchi'>(profile?.account_type === 'quruvchi' ? 'quruvchi' : 'ega');
  const [company, setCompany] = useState(profile?.company || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (name.trim().length < 2) { setErr(t('Ismingizni yozing.')); return; }
    if (phone.replace(/\D/g, '').length < 9) { setErr(t("Telefon raqamni to'liq yozing, masalan +998 90 123 45 67.")); return; }
    setErr('');
    setBusy(true);
    const { error } = await sb.from('profiles').upsert({
      id: session!.user.id,
      full_name: name.trim().slice(0, 80),
      phone: phone.trim().slice(0, 20),
      account_type: type,
      company: company.trim().slice(0, 100),
    });
    setBusy(false);
    if (error) { setErr(t("Saqlanmadi. Qayta urinib ko'ring.")); return; }
    await reloadProfile();
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        <Txt muted size={14}>{t("Ism va telefon raqam e'lonlaringizda va arizalaringizda ishlatiladi.")}</Txt>
        <Field label={t('Ismingiz')} value={name} onChangeText={setName} maxLength={80} autoComplete="name" textContentType="name" />
        <Field label={t('Telefon raqam')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} autoComplete="tel" textContentType="telephoneNumber" />
        <Txt size={13} weight="medium" muted>{t('Siz kimsiz?')}</Txt>
        <Seg options={[{ value: 'ega', label: t('Uy egasi') }, { value: 'quruvchi', label: t('Quruvchi kompaniya') }]} value={type} onChange={setType} />
        {type === 'quruvchi' && <Field label={t('Kompaniya nomi')} value={company} onChangeText={setCompany} maxLength={100} />}
        <Notice kind="warn">{t("Uykor'da makler sifatida e'lon joylash taqiqlangan. Makler ekanligi aniqlangan hisoblar bloklanadi.")}</Notice>
        {err ? <Txt color={C.danger}>{err}</Txt> : null}
        <Btn title={t('Saqlash')} busy={busy} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
