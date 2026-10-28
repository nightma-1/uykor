import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { saveDeveloper } from '../../actions';
import CallHoursFields from '@/components/CallHoursFields';
import { DEVELOPER_COLS, type CallHours } from '@/lib/contact';
import { removeMember } from '../../claim-actions';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function EditDeveloper({ params, searchParams }: P) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const isNew = id === 'yangi';
  const { data: d0 } = isNew ? { data: null } : await sb.from('developer_stats').select(DEVELOPER_COLS).eq('id', id).maybeSingle();
  const dphone = d0 ? ((await sb.rpc('my_contact', { kind: 'quruvchi', rid: id })).data as string | null) : null;
  const d = d0 ? { ...(d0 as unknown as Record<string, unknown>), phone: dphone ?? '' } : null;
  const { data: mem } = isNew ? { data: [] as { user_id: string }[] } : await sb.from('developer_members').select('user_id').eq('developer_id', id);
  const ids = (mem || []).map((m) => m.user_id);
  const { data: people } = ids.length ? await sb.from('profiles').select('id, full_name, phone').in('id', ids) : { data: [] as { id: string; full_name: string; phone: string }[] };
  const v = (k: string) => (d ? (d as Record<string, unknown>)[k] ?? '' : '') as string | number;

  return (
    <AdminShell email={user.email ?? ''}>
      <Link href="/admin/quruvchilar" style={{ textDecoration: 'none', fontSize: 14 }}>{t("← Quruvchilar")}</Link>
      <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{isNew ? t('Yangi quruvchi') : String(v('name'))}</h1>
      {d && <span className="muted">{t("Hozirgi reyting:")} <strong style={{ color: 'var(--lapis)' }}>{Number(v('rating')).toFixed(1)}</strong>{t(". U pastdagi faktlardan avtomatik hisoblanadi.")}</span>}
      {sp.saqlandi && <div className="success">{t("Saqlandi.")}</div>}
      {sp.xato && <div className="error" role="alert">{t("Saqlanmadi:")} {sp.xato}</div>}

      <form action={saveDeveloper} className="card section" style={{ gap: 18 }}>
        <input type="hidden" name="id" value={isNew ? '' : id} />
        <div className="form-grid">
          <F label={t("Nomi")} name="name" def={v('name')} required />
          <F label={t("Bosh harflar (logotip o'rniga)")} name="initials" def={v('initials')} hint={t("masalan AQ")} />
          <F label={t("Shahar")} name="city" def={v('city') || 'Samarqand'} />
          <F label={t("Tashkil topgan yil")} name="founded_year" def={v('founded_year')} />
          <F label={t("Telefon")} name="phone" def={v('phone')} />
          <F label={t("Havola nomi (ixtiyoriy)")} name="slug" def={v('slug')} />
        </div>
        <CallHoursFields lang={lang} value={d as Partial<CallHours> | null} />
        <div className="field"><label htmlFor="description">{t("Tavsif (o'zbekcha)")}</label><textarea id="description" name="description" className="input" defaultValue={String(v('description'))} /></div>
        <div className="field"><label htmlFor="description_ru">{t('Tavsif (ruscha, ixtiyoriy)')}</label><textarea id="description_ru" name="description_ru" className="input" defaultValue={String(v('description_ru'))} /><span className="muted" style={{ fontSize: 12 }}>{t("Bo'sh qolsa, ruscha sahifada o'zbekcha tavsif ko'rsatiladi.")}</span></div>
        <h2 className="h2">{t("Reyting uchun faktlar")}</h2>
        <div className="form-grid">
          <F label={t("Jami topshirgan uylar")} name="delivered_total" def={v('delivered_total') || 0} />
          <F label={t("Shundan o'z vaqtida")} name="delivered_on_time" def={v('delivered_on_time') || 0} />
          <F label={t("Sotilgan xonadonlar")} name="sold_units" def={v('sold_units') || 0} />
          <F label={t("Kadastr o'rtacha, oy")} name="avg_kadastr_months" def={v('avg_kadastr_months')} />
          <F label={t("Xaridorlar bahosi (1–5)")} name="buyer_rating" def={v('buyer_rating')} />
          <F label={t("Sharhlar soni")} name="review_count" def={v('review_count') || 0} />
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <label className="check"><input type="checkbox" name="verified" defaultChecked={Boolean(v('verified'))} /> {t("Tekshirilgan quruvchi")}</label>
          <label className="check"><input type="checkbox" name="docs_open" defaultChecked={Boolean(v('docs_open'))} /> {t("Hujjatlarini ochiq ko'rsatgan")}</label>
        </div>
        <div><button className="btn" type="submit">{t("Saqlash")}</button></div>
      </form>
      {!isNew && (
        <section className="card section">
          <h2 className="h2">{t('Kabinet xodimlari')}</h2>
          <span className="muted" style={{ fontSize: 14 }}>{t("Bu odamlar quruvchi kabinetida majmualarni tahrirlaydi va arizalarni ko'radi. Yangi xodim kabinetdagi ariza orqali qo'shiladi.")}</span>
          {ids.length === 0 && <span className="muted">{t("Hali xodim yo'q.")}</span>}
          {ids.map((uid) => {
            const p = (people || []).find((x) => x.id === uid);
            return (
              <form key={uid} action={removeMember} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="hidden" name="developer_id" value={id} />
                <input type="hidden" name="user_id" value={uid} />
                <strong>{p?.full_name || '—'}</strong><span className="muted">{p?.phone || ''}</span>
                <button className="btn ghost small" type="submit">{t('Kabinetdan chiqarish')}</button>
              </form>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}

function F({ label, name, def, required, hint }: { label: string; name: string; def: string | number; required?: boolean; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" defaultValue={def === null ? '' : String(def)} required={required} />
      {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
    </div>
  );
}
