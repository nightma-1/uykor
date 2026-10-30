import Link from 'next/link';
import ImageUpload from '@/components/ImageUpload';
import { monthYear, som } from '@/lib/format';
import { T, type Lang } from '@/lib/i18n';
import type { Complex, UnitType } from '@/lib/types';

type Action = (f: FormData) => Promise<void>;
export type ComplexActions = {
  saveComplex: Action;
  addUnit: Action;
  deleteUnit: Action;
  addProgress: Action;
  deleteProgress: Action;
  addNearby: Action;
  deleteNearby: Action;
  addPhoto: Action;
  deletePhoto: Action;
  deleteComplex?: Action;
};

export type FullComplex = Complex & {
  unit_types: UnitType[];
  progress_updates: { id: string; month: string; title: string }[];
  nearby: { id: string; kind: string; distance_m: number }[];
  complex_photos: { id: string; url: string; caption: string; sort: number; created_at: string }[];
};

type Props = {
  mode: 'admin' | 'dev';
  lang: Lang;
  c: FullComplex | null;
  devs: { id: string; name: string }[];
  actions: ComplexActions;
  /** Owner folder for uploads in developer mode (storage policy: first folder = user id). */
  userId?: string;
};

/** Complex form shared by the admin panel and the developer cabinet. Developers cannot touch verified facts. */
export default function ComplexEditor({ mode, lang, c, devs, actions, userId }: Props) {
  const t = T(lang);
  const admin = mode === 'admin';
  const isNew = !c;
  const v = (k: string) => (c ? (c as Record<string, unknown>)[k] ?? '' : '') as string | number;
  const up = admin ? {} : { bucket: 'elonlar' as const };
  const folder = (f: string) => (admin ? f : `${userId}/majmua`);

  return (
    <>
      <form action={actions.saveComplex} className="card section" style={{ gap: 18 }}>
        <input type="hidden" name="id" value={c?.id ?? ''} />
        {!admin && c && (
          <div className={c.published ? 'success' : 'notice'} style={{ fontWeight: 600 }}>
            {c.published ? t('Majmua saytda ko\'rinmoqda.') : t("Majmua tekshiruvda. Uykor ma'lumotlarni tekshirgach, saytda paydo bo'ladi.")}
          </div>
        )}
        <h2 className="h2">{t("Asosiy ma'lumotlar")}</h2>
        <div className="form-grid">
          <F label={t('Nomi')} name="name" def={v('name')} required />
          {admin || devs.length > 1 ? (
            <div className="field"><label htmlFor="developer_id">{t('Quruvchi')}</label>
              <select id="developer_id" name="developer_id" className="input" defaultValue={String(v('developer_id'))} required disabled={!admin && !isNew}>
                {devs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <input type="hidden" name="developer_id" value={devs[0]?.id ?? ''} />
          )}
          <F label={t('Shahar')} name="city" def={v('city') || 'Samarqand'} />
          <F label={t('Tuman / mahalla')} name="district" def={v('district')} />
          <F label={t('Manzil')} name="address" def={v('address')} />
          {admin && <F label={t('Havola nomi (ixtiyoriy)')} name="slug" def={v('slug')} hint={t("bo'sh qolsa nomdan yasaladi")} />}
        </div>
        <h2 className="h2">{t('Xaritadagi joyi')}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('Google yoki Yandex xaritada joyni bosib, koordinatalarni nusxa oling (masalan 39.6705, 66.9468).')}</p>
        <div className="form-grid">
          <F label={t('Kenglik (lat)')} name="lat" def={v('lat')} required />
          <F label={t('Uzunlik (lng)')} name="lng" def={v('lng')} required />
        </div>
        <h2 className="h2">{t("Narx va to'lov")}</h2>
        <div className="form-grid">
          <F label={t("1 m² narxi, so'm")} name="price_m2" def={v('price_m2')} required hint={t('masalan 8900000')} />
          <F label={t('Eng kichik maydon, m²')} name="area_min" def={v('area_min')} />
          <F label={t('Eng katta maydon, m²')} name="area_max" def={v('area_max')} />
          <F label={t("Bo'lib to'lash, oy")} name="installment_months" def={v('installment_months')} hint={t("0 = yo'q")} />
          <F label={t("Boshlang'ich to'lov, %")} name="first_payment_pct" def={v('first_payment_pct') || 30} />
        </div>
        <h2 className="h2">{t('Qurilish va hujjatlar')}</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="status">{t('Holati')}</label>
            <select id="status" name="status" className="input" defaultValue={String(v('status') || 'qurilmoqda')}><option value="qurilmoqda">{t('Qurilmoqda')}</option><option value="topshirilgan">{t('Topshirilgan')}</option></select></div>
          {admin ? (
            <div className="field"><label htmlFor="kadastr_status">{t('Kadastr')}</label>
              <select id="kadastr_status" name="kadastr_status" className="input" defaultValue={String(v('kadastr_status') || 'jarayonda')}><option value="jarayonda">{t('Jarayonda')}</option><option value="bor">{t('Chiqqan')}</option></select></div>
          ) : (
            <div className="field"><span className="label">{t('Kadastr')}</span>
              <input type="hidden" name="kadastr_status" value={String(v('kadastr_status') || 'jarayonda')} />
              <span style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>{v('kadastr_status') === 'bor' ? t('Chiqqan') : t('Jarayonda')}</span>
              <span className="muted" style={{ fontSize: 12 }}>{t('Kadastr chiqqanini Uykor hujjat bilan tekshirib belgilaydi.')}</span>
            </div>
          )}
          <F label={t("Va'da qilingan topshirish sanasi")} name="promised_date" def={v('promised_date')} type="date" />
          {admin && <F label={t('Haqiqiy topshirilgan sana')} name="delivered_date" def={v('delivered_date')} type="date" />}
          {admin && <F label={t('Kadastr necha oyda chiqdi')} name="kadastr_months" def={v('kadastr_months')} />}
          <F label={t('Qurilish, %')} name="progress" def={v('progress') || 0} />
          <F label={t('Qavatlar')} name="floors" def={v('floors')} />
          <F label={t('Bloklar')} name="blocks" def={v('blocks')} />
        </div>
        <ImageUpload lang={lang} name="cover_url" folder={folder('muqova')} {...up} defaultUrl={String(v('cover_url') || '')} label={t("Asosiy rasm (ro'yxatda va sahifa tepasida)")} />
        <div className="field"><label htmlFor="description">{t("Tavsif (o'zbekcha)")}</label><textarea id="description" name="description" className="input" defaultValue={String(v('description'))} /></div>
        <div className="field"><label htmlFor="description_ru">{t('Tavsif (ruscha, ixtiyoriy)')}</label><textarea id="description_ru" name="description_ru" className="input" defaultValue={String(v('description_ru'))} /><span className="muted" style={{ fontSize: 12 }}>{t("Bo'sh qolsa, ruscha sahifada o'zbekcha tavsif ko'rsatiladi.")}</span></div>
        {admin && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <label className="check"><input type="checkbox" name="docs_verified" defaultChecked={isNew ? false : Boolean(v('docs_verified'))} /> {t('Hujjatlar tekshirilgan')}</label>
            <label className="check"><input type="checkbox" name="published" defaultChecked={isNew ? true : Boolean(v('published'))} /> {t("Saytda ko'rinsin")}</label>
          </div>
        )}
        <div><button className="btn" type="submit">{isNew && !admin ? t('Saqlash va davom etish') : t('Saqlash')}</button></div>
        {isNew && !admin && <span className="muted" style={{ fontSize: 13 }}>{t("Saqlagandan keyin xonadon turlari, rasmlar va qurilish yangiliklarini qo'sha olasiz.")}</span>}
      </form>

      {c && (
        <>
          <section className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderColor: 'var(--lapis)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 300px' }}>
              <h2 className="h2">{t('Xonadonlar va 3D (shaxmatka)')}</h2>
              <span className="muted" style={{ fontSize: 14 }}>{t("Bloklar, qavat planirovkalari, har bir xonadon holati va narxi. Saytda fasad, 3D bino va xonadon tanlash shulardan quriladi.")}</span>
            </div>
            <Link href={admin ? `/admin/majmualar/${c.id}/xonadonlar` : `/kabinet/quruvchi/majmua/${c.id}/xonadonlar`} className="btn">{t('Shaxmatkani ochish')}</Link>
          </section>

          <section className="card section">
            <h2 className="h2">{t('Xonadon turlari')}</h2>
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>{t('Xona')}</th><th>{t('Maydon')}</th><th>{t('Narx')}</th><th>{t("Bo'sh")}</th><th></th></tr></thead>
                <tbody>
                  {[...(c.unit_types || [])].sort((a, b) => a.rooms - b.rooms).map((u) => (
                    <tr key={u.id}>
                      <td>{u.rooms} {t('xonali')}</td><td>{u.area} m²</td><td>{som(u.price ?? u.area * c.price_m2)} {t("so'm")}</td><td>{u.available ?? '—'}</td>
                      <td><form action={actions.deleteUnit}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="complex_id" value={c.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form action={actions.addUnit} className="form-grid" style={{ alignItems: 'end' }}>
              <input type="hidden" name="complex_id" value={c.id} />
              <F label={t('Xonalar soni')} name="rooms" def="" required />
              <F label={t('Maydon, m²')} name="area" def="" required />
              <F label={t("Narx, so'm (ixtiyoriy)")} name="price" def="" hint={t("bo'sh = maydon × m² narxi")} />
              <F label={t("Bo'sh xonadonlar")} name="available" def="" />
              <div><button className="btn ghost" type="submit">{t("+ Qo'shish")}</button></div>
            </form>
          </section>

          <section className="card section">
            <h2 className="h2">{t('Qurilish yangiliklari (oyma-oy)')}</h2>
            {[...(c.progress_updates || [])].sort((a, b) => a.month.localeCompare(b.month)).map((p) => (
              <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{monthYear(p.month, lang)}</strong><span>{p.title}</span>
                <form action={actions.deleteProgress}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="complex_id" value={c.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
              </div>
            ))}
            <form action={actions.addProgress} className="form-grid" style={{ alignItems: 'end' }}>
              <input type="hidden" name="complex_id" value={c.id} />
              <F label={t('Oy')} name="month" def="" type="month" required />
              <F label={t('Nima qilindi')} name="title" def="" required hint={t('masalan: 12-qavat karkasi')} />
              <F label={t('Nima qilindi (ruscha)')} name="title_ru" def="" hint={t('masalan: каркас 12 этажа')} />
              <ImageUpload lang={lang} name="photo_url" folder={folder('qurilish')} {...up} label={t('Rasm (ixtiyoriy)')} />
              <div><button className="btn ghost" type="submit">{t("+ Qo'shish")}</button></div>
            </form>
          </section>

          <section className="card section">
            <h2 className="h2">{t('Rasmlar galereyasi')}</h2>
            <span className="muted" style={{ fontSize: 14 }}>{t("Hovli, kirish qismi, xonadon ichi, planirovka. Birinchi to'rttasi sahifa tepasida ko'rinadi.")}</span>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[...(c.complex_photos || [])].sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at)).map((ph) => (
                <div key={ph.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 160 }}>
                  <img src={ph.url} alt={ph.caption} style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }} />
                  <span style={{ fontSize: 13 }}>{ph.caption || '—'}</span>
                  <form action={actions.deletePhoto}><input type="hidden" name="id" value={ph.id} /><input type="hidden" name="complex_id" value={c.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
                </div>
              ))}
            </div>
            <form action={actions.addPhoto} className="form-grid" style={{ alignItems: 'end' }}>
              <input type="hidden" name="complex_id" value={c.id} />
              <F label={t('Izoh (ixtiyoriy)')} name="caption" def="" hint={t('masalan: Hovli')} />
              <ImageUpload lang={lang} name="url" folder={folder('galereya')} {...up} label={t('Rasm')} autoSubmit />
            </form>
            <span className="muted" style={{ fontSize: 12 }}>{t("Rasm tanlanishi bilan yuklanadi va galereyaga qo'shiladi.")}</span>
          </section>

          <section className="card section">
            <h2 className="h2">{t('Atrofida')}</h2>
            {(c.nearby || []).map((n) => (
              <div key={n.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <strong>{n.kind}</strong><span>{n.distance_m} m</span>
                <form action={actions.deleteNearby}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="complex_id" value={c.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
              </div>
            ))}
            <form action={actions.addNearby} className="form-grid" style={{ alignItems: 'end' }}>
              <input type="hidden" name="complex_id" value={c.id} />
              <F label={t('Joy turi')} name="kind" def="" required hint={t("Maktab, Bog'cha, Bozor...")} />
              <F label={t('Masofa, metr')} name="distance_m" def="" required />
              <div><button className="btn ghost" type="submit">{t("+ Qo'shish")}</button></div>
            </form>
          </section>

          {admin && actions.deleteComplex && (
            <form action={actions.deleteComplex} className="card section" style={{ alignItems: 'flex-start' }}>
              <input type="hidden" name="id" value={c.id} />
              <h2 className="h2">{t("Majmuani o'chirish")}</h2>
              <span className="muted" style={{ fontSize: 14 }}>{t("Majmua, uning xonadonlari va arizalari butunlay o'chadi. Vaqtincha yashirish uchun \"Saytda ko'rinsin\" belgisini olib tashlang.")}</span>
              <label className="check"><input type="checkbox" required /> {t("Ha, butunlay o'chirmoqchiman")}</label>
              <button className="btn ghost small" type="submit" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t("O'chirish")}</button>
            </form>
          )}
          {!admin && c.published && (
            <Link href={`/jk/${c.slug}`} target="_blank" className="btn ghost small" style={{ alignSelf: 'flex-start' }}>{t("Saytda ko'rish ↗")}</Link>
          )}
        </>
      )}
    </>
  );
}

function F({ label, name, def, required, hint, type = 'text' }: { label: string; name: string; def: string | number; required?: boolean; hint?: string; type?: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="input" defaultValue={def === null ? '' : String(def)} required={required} />
      {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
    </div>
  );
}
