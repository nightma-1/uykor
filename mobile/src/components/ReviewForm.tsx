import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { sb } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { Btn, Field, Notice, Txt } from './ui';

export default function ReviewForm({ masterId, ownerId }: { masterId: string; ownerId: string | null }) {
  const { t } = useLang();
  const { session, profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');

  if (!session) {
    return <Btn kind="ghost" title={t('Sharh yozish uchun kiring')} onPress={() => router.push('/kirish')} />;
  }
  if (session.user.id === ownerId) return null;
  if (state === 'done') return <Notice kind="ok">{t("Rahmat! Sharhingiz tekshiruvdan keyin chiqadi.")}</Notice>;

  async function send() {
    if (!rating) { setErr(t('Baho qo\'ying (1–5 yulduz).')); return; }
    if (body.trim().length < 10) { setErr(t("Kamida bir-ikki gap yozing: qanday ish qilindi, natija qanday.")); return; }
    setErr('');
    setState('busy');
    const { error } = await sb.from('master_reviews').insert({
      master_id: masterId,
      author_id: session!.user.id,
      author_name: (profile?.full_name || t('Mijoz')).slice(0, 60),
      rating,
      body: body.trim().slice(0, 2000),
    });
    if (error) { setState('idle'); setErr(error.code === '23505' ? t('Bu ustaga allaqachon sharh yozgansiz.') : t("Yuborilmadi. Qayta urinib ko'ring.")); return; }
    setState('done');
  }

  return (
    <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }}>
      <Txt weight="semi">{t('Sharh yozing')}</Txt>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={t('Baho')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setRating(n)}
            accessibilityRole="radio"
            accessibilityLabel={t('{n} yulduz', { n })}
            accessibilityState={{ checked: rating === n }}
            style={{ width: 46, height: 46, borderRadius: R.md, borderWidth: 1, borderColor: n <= rating ? C.star : C.lineStrong, backgroundColor: n <= rating ? '#FFF8E6' : C.card, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 22, color: n <= rating ? C.star : '#C3CBD9' }}>★</Text>
          </Pressable>
        ))}
      </View>
      <Field label={t('Sharhingiz')} value={body} onChangeText={setBody} multiline maxLength={2000} placeholder={t("Qanday ish qildirdingiz, sifat, narx, muddat...")} />
      {err ? <Txt color={C.danger}>{err}</Txt> : null}
      <Btn title={t('Yuborish')} busy={state === 'busy'} onPress={send} />
    </View>
  );
}
