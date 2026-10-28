import { useState } from 'react';
import { Linking, View } from 'react-native';
import { callHours, contactPhone } from '@/lib/api';
import { cleanPhone } from '@/lib/format';
import { useLang, type TFn } from '@/lib/i18n';
import { sb } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { IconPhone } from './icons';
import { Btn, Field, Notice, Seg, Txt } from './ui';

const DAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function hoursText(h: { call_days: number[] | null; call_from: string | null; call_to: string | null }, lang: 'uz' | 'ru', t: TFn) {
  const names = lang === 'ru' ? DAYS_RU : DAYS_UZ;
  const days = (h.call_days || []).slice().sort((a, b) => a - b);
  const d = days.length === 7 ? t('har kuni') : days.map((n) => names[n - 1]).join(', ');
  const time = h.call_from && h.call_to ? `${h.call_from.slice(0, 5)}–${h.call_to.slice(0, 5)}` : '';
  return [d, time].filter(Boolean).join(', ');
}

/** Shows the phone only within the owner's calling hours (decided on the server). */
export function PhoneReveal({ kind, id, name }: { kind: 'elon' | 'usta' | 'quruvchi'; id: string; name?: string }) {
  const { t, lang } = useLang();
  const [state, setState] = useState<'idle' | 'busy' | 'open' | 'closed' | 'none' | 'error'>('idle');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');

  async function reveal() {
    setState('busy');
    const r = await contactPhone(kind, id);
    if (!r) { setState('error'); return; }
    if (r.none) { setState('none'); return; }
    if (r.open && r.phone) { setPhone(r.phone); setState('open'); return; }
    const h = await callHours(kind === 'elon' ? 'listings' : kind === 'usta' ? 'masters' : 'developers', id);
    setHours(h ? hoursText(h, lang, t) : '');
    setState('closed');
  }

  return (
    <View style={{ gap: 10 }}>
      {name ? (
        <View>
          <Txt size={13} muted>{t("E'lon beruvchi")}</Txt>
          <Txt weight="bold">{name}</Txt>
        </View>
      ) : null}
      {state === 'open' ? (
        <>
          <Txt size={22} weight="bold" selectable>{phone}</Txt>
          <Btn title={t("Qo'ng'iroq qilish")} icon={<IconPhone />} onPress={() => Linking.openURL(`tel:${cleanPhone(phone)}`)} />
        </>
      ) : (
        <Btn title={t("Raqamni ko'rsatish")} icon={<IconPhone />} busy={state === 'busy'} onPress={reveal} />
      )}
      {state === 'closed' && (
        <Notice kind="warn">
          <Txt size={14} color={C.warnInk}>
            {t("Hozir qo'ng'iroq vaqti emas.")}{hours ? ` ${t('Qo\'ng\'iroq vaqti: {h}.', { h: hours })}` : ''}
          </Txt>
        </Notice>
      )}
      {state === 'none' && <Txt muted>{t("Telefon raqam ko'rsatilmagan.")}</Txt>}
      {state === 'error' && <Txt color={C.danger}>{t("Raqamni olib bo'lmadi. Internetni tekshiring.")}</Txt>}
    </View>
  );
}

const REASONS = [
  { value: 'makler', label: 'Bu makler, egasi emas' },
  { value: 'band', label: 'Allaqachon band yoki sotilgan' },
  { value: 'yolgon', label: "Ma'lumot yolg'on" },
  { value: 'boshqa', label: 'Boshqa sabab' },
] as const;

export function ReportListing({ id }: { id: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('makler');
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState<'no' | 'busy' | 'ok' | 'err'>('no');

  if (sent === 'ok') return <Notice kind="ok">{t("Rahmat! Moderator e'lonni tekshiradi.")}</Notice>;
  if (!open) return <Btn kind="ghost" small title={t('Shikoyat qilish')} onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />;

  async function send() {
    setSent('busy');
    const { error } = await sb.from('listing_reports').insert({ listing_id: id, reason, comment: comment.trim().slice(0, 500) });
    setSent(error ? 'err' : 'ok');
  }

  return (
    <View style={{ gap: 10 }}>
      <Txt weight="semi">{t('Nima noto\'g\'ri?')}</Txt>
      <Seg options={REASONS.map((r) => ({ value: r.value, label: t(r.label) }))} value={reason} onChange={setReason} />
      <Field label={t('Izoh (ixtiyoriy)')} value={comment} onChangeText={setComment} multiline maxLength={500} />
      {sent === 'err' && <Txt color={C.danger}>{t("Yuborilmadi. Qayta urinib ko'ring.")}</Txt>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small title={t('Yuborish')} busy={sent === 'busy'} onPress={send} />
        <Btn small kind="ghost" title={t('Bekor qilish')} onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}
