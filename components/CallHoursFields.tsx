import { DAY_SHORT, type CallHours } from '@/lib/contact';
import '@/app/contact.css';
import { T, type Lang } from '@/lib/i18n';

/** Day checkboxes + from/to times; read on the server with readCallHours(). */
export default function CallHoursFields({ lang, value, idp = '' }: { lang: Lang; value?: Partial<CallHours> | null; idp?: string }) {
  const t = T(lang);
  const days = new Set(value?.call_days ?? [1, 2, 3, 4, 5, 6, 7]);
  return (
    <fieldset className="call-hours">
      <legend>{t("Qo'ng'iroq qabul qilish vaqti")}</legend>
      <span className="muted" style={{ fontSize: 13 }}>{t("Mijozlar raqamingizni faqat shu kunlarda va shu soatlarda ko'radi (Samarqand vaqti). Qolgan vaqtda ularga qachon qo'ng'iroq qilish mumkinligi ko'rsatiladi.")}</span>
      <div className="day-picks" role="group" aria-label={t('Kunlar')}>
        {DAY_SHORT.map((d, i) => (
          <label key={d} className="day-pick">
            <input type="checkbox" name="call_days" value={i + 1} defaultChecked={days.has(i + 1)} />
            <span>{t(d)}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ width: 130 }}><label htmlFor={`${idp}call_from`}>{t('Qaysi soatdan')}</label><input id={`${idp}call_from`} name="call_from" type="time" className="input" defaultValue={(value?.call_from || '09:00').slice(0, 5)} /></div>
        <div className="field" style={{ width: 130 }}><label htmlFor={`${idp}call_to`}>{t('Qaysi soatgacha')}</label><input id={`${idp}call_to`} name="call_to" type="time" className="input" defaultValue={(value?.call_to || '21:00').slice(0, 5)} /></div>
      </div>
    </fieldset>
  );
}
