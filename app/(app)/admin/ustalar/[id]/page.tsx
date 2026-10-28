import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import ImageUpload from '@/components/ImageUpload';
import CallHoursFields from '@/components/CallHoursFields';
import { MASTER_TABLE_COLS } from '@/lib/contact';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { STATUS_LABEL } from '@/lib/listings';
import { CATEGORIES, type Master } from '@/lib/masters';
import { adminSaveMaster, approveMaster, rejectMaster, setReviewStatus, adminAddMasterPhoto, adminDeleteMasterPhoto, blockMasterOwner, adminDeleteMaster } from '../../usta-actions';

export const dynamic = 'force-dynamic';

const REV_LABEL: Record<string, string> = { moderatsiya: 'Kutmoqda', faol: 'Saytda', rad: 'Rad etilgan' };

export default async function AdminMaster({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const isNew = id === 'yangi';
  const { data: mr } = isNew ? { data: null } : await sb.from('masters').select(MASTER_TABLE_COLS).eq('id', id).maybeSingle();
  const mphone = mr ? ((await sb.rpc('my_contact', { kind: 'usta', rid: id })).data as string | null) : null;
  const m = mr ? ({ ...(mr as unknown as Master), phone: mphone ?? '' }) : null;
  if (!isNew && !m) {
    return <AdminShell email={user.email ?? ''}><span>Usta topilmadi.</span><Link href="/admin/ustalar">← Orqaga</Link></AdminShell>;
  }

  let photos: { id: string; url: string }[] = [];
  let reviews: { id: string; author_name: string; rating: number; body: string; status: string; created_at: string }[] = [];
  let docs: { id: string; url: string | null }[] = [];
  type Prof = { full_name: string; phone: string; blocked: boolean };
  let prof: Prof | null = null;
  if (m) {
    const [{ data: ph }, { data: rv }, { data: dc }, { data: pr }] = await Promise.all([
      sb.from('master_photos').select('id, url').eq('master_id', m.id).order('sort'),
      sb.from('master_reviews').select('id, author_name, rating, body, status, created_at').eq('master_id', m.id).order('created_at', { ascending: false }),
      sb.from('master_docs').select('id, path').eq('master_id', m.id),
      m.owner_id ? sb.from('profiles').select('full_name, phone, blocked').eq('id', m.owner_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    photos = ph || [];
    reviews = rv || [];
    prof = pr as Prof | null;
    // Short-lived links so documents are never exposed publicly.
    docs = await Promise.all((dc || []).map(async (d) => {
      const { data } = await sb.storage.from('hujjatlar').createSignedUrl(d.path, 600);
      return { id: d.id, url: data?.signedUrl ?? null };
    }));
  }

  return (
    <AdminShell email={user.email ?? ''}>
      <Link href="/admin/ustalar" style={{ textDecoration: 'none', fontSize: 14 }}>{t("← Ustalar")}</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h1 className="display" style={{ margin: 0, fontSize: 26 }}>{m ? m.name : t('Yangi usta')}</h1>
        {m && <span className="chip gray">{t(STATUS_LABEL[m.status])}{m.verification === 'tasdiqlangan' ? ` · ${t('tekshirilgan')}` : ''}</span>}
      </div>
      {sp.saqlandi && <div className="success">{t("Saqlandi.")}</div>}
      {sp.xato && <div className="error" role="alert">{sp.xato}</div>}
      {m?.status === 'faol' && <Link href={`/usta/${m.id}`} target="_blank">{t("Saytda ko'rish ↗")}</Link>}

      {m?.owner_id && (
        <section className="card section">
          <h2 className="h2">{t("Profil egasi")}</h2>
          <span>{prof?.full_name || '—'} · {prof?.phone || '—'}</span>
          {prof?.blocked ? <span className="chip warn" style={{ alignSelf: 'flex-start' }}>{t("Bloklangan")}</span> : (
            <form action={blockMasterOwner}>
              <input type="hidden" name="id" value={m.id} /><input type="hidden" name="owner_id" value={m.owner_id} />
              <label className="check"><input type="checkbox" required /> {t("Soxta profil, hisobni bloklash")}</label>
              <button className="btn ghost small" type="submit" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t("Bloklash")}</button>
            </form>
          )}
          <h3 style={{ margin: '8px 0 0', fontSize: 16 }}>{t("Pasport")}</h3>
          {docs.length === 0 && <span className="muted">{m.verification === 'tasdiqlangan' ? t("Shaxs avval tasdiqlangan, hujjat o'chirilgan.") : t('Pasport yuklanmagan.')}</span>}
          <span className="muted" style={{ fontSize: 13 }}>{t("Tekshiring: pasportdagi ism profil egasining ismiga mos keladimi. Havola 10 daqiqa ishlaydi. Qaror qabul qilinishi bilan hujjat o'chiriladi.")}</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {docs.map((d) => (
              <a key={d.id} href={d.url ?? '#'} target="_blank" rel="noreferrer">
                {d.url && <img src={d.url} alt={t("Pasport")} style={{ width: 260, height: 180, objectFit: 'contain', background: '#EEF0F4', borderRadius: 10 }} />}
              </a>
            ))}
          </div>
          {m.status === 'moderatsiya' && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <form action={approveMaster} className="card section" style={{ flex: '1 1 260px' }}>
                <input type="hidden" name="id" value={m.id} />
                <strong>{t("Tasdiqlash")}</strong>
                <span className="muted" style={{ fontSize: 14 }}>{t("Profil saytga chiqadi va \"Tekshirilgan usta\" belgisini oladi.")}</span>
                <button className="btn" type="submit">{t("Tasdiqlash")}</button>
              </form>
              <form action={rejectMaster} className="card section" style={{ flex: '1 1 260px' }}>
                <input type="hidden" name="id" value={m.id} />
                <strong>{t("Rad etish")}</strong>
                <label htmlFor="reason" className="muted" style={{ fontSize: 13 }}>{t("Sabab (ustaga ko'rinadi)")}</label>
                <input id="reason" name="reason" className="input" placeholder={t("masalan: pasportdagi ism mos kelmadi")} />
                <button className="btn ghost" type="submit">{t("Rad etish")}</button>
              </form>
            </div>
          )}
        </section>
      )}

      <form action={adminSaveMaster} className="card section" style={{ gap: 18 }}>
        <input type="hidden" name="id" value={m?.id ?? ''} />
        <h2 className="h2">{m ? t("Ma'lumotlarni tahrirlash") : t("Usta ma'lumotlari")}</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="name">{t("Ism yoki brigada nomi")}</label><input id="name" name="name" className="input" required defaultValue={m?.name ?? ''} /></div>
          <div className="field"><label htmlFor="phone">{t("Telefon")}</label><input id="phone" name="phone" className="input" defaultValue={m?.phone ?? ''} /></div>
          <div className="field"><label htmlFor="experience_years">{t("Tajriba, yil")}</label><input id="experience_years" name="experience_years" className="input" inputMode="numeric" defaultValue={m?.experience_years ?? ''} /></div>
          <div className="field"><label htmlFor="price_note">{t("Narx")}</label><input id="price_note" name="price_note" className="input" defaultValue={m?.price_note ?? ''} /></div>
          <div className="field"><label htmlFor="districts">{t("Hududlar")}</label><input id="districts" name="districts" className="input" defaultValue={m?.districts ?? ''} /></div>
          <div className="field"><label htmlFor="status">{t("Holati")}</label>
            <select id="status" name="status" className="input" defaultValue={m?.status ?? 'faol'}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
            </select>
          </div>
        </div>
        <CallHoursFields lang={lang} value={m} />
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="muted" style={{ fontSize: 12, textTransform: 'uppercase', marginBottom: 6 }}>{t("Yo'nalishlar")}</legend>
          <div className="form-grid" style={{ gap: '0 14px' }}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <label key={k} className="check"><input type="checkbox" name="categories" value={k} defaultChecked={m?.categories.includes(k)} /> {t(v)}</label>
            ))}
          </div>
        </fieldset>
        <div className="field"><label htmlFor="description">{t("Tavsif")}</label><textarea id="description" name="description" className="input" defaultValue={m?.description ?? ''} /></div>
        <ImageUpload lang={lang} name="avatar_url" folder="ustalar" defaultUrl={m?.avatar_url ?? ''} label={t("Rasm")} />
        <label className="check"><input type="checkbox" name="verified" defaultChecked={m?.verification === 'tasdiqlangan'} /> {t("Tekshirilgan usta (shaxsini o'zingiz tasdiqlagansiz)")}</label>
        <div><button className="btn" type="submit">{t("Saqlash")}</button></div>
      </form>

      {m && (
        <>
          <section className="card section">
            <h2 className="h2">{t("Ish rasmlari (")}{photos.length})</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {photos.map((p) => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 150 }}>
                  <img src={p.url} alt="" style={{ width: 150, height: 104, objectFit: 'cover', borderRadius: 10 }} />
                  <form action={adminDeleteMasterPhoto}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="master_id" value={m.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
                </div>
              ))}
            </div>
            <form action={adminAddMasterPhoto}>
              <input type="hidden" name="master_id" value={m.id} />
              <ImageUpload lang={lang} name="url" folder="ustalar" label={t("Rasm qo'shish")} autoSubmit />
            </form>
          </section>

          <section className="card section">
            <h2 className="h2">{t("Sharhlar (")}{reviews.length})</h2>
            {reviews.length === 0 && <span className="muted">{t("Sharh yo'q.")}</span>}
            {reviews.map((r) => (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span><strong>{r.author_name}</strong> · <span style={{ color: '#E3A008' }}>{'★'.repeat(r.rating)}</span> · <span className="chip gray">{t(REV_LABEL[r.status] ?? r.status)}</span></span>
                <span style={{ whiteSpace: 'pre-line' }}>{r.body}</span>
                <form action={setReviewStatus} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="master_id" value={m.id} />
                  {r.status !== 'faol' && <button className="btn small" type="submit" name="status" value="faol">{t("Chiqarish")}</button>}
                  {r.status !== 'rad' && <button className="btn small ghost" type="submit" name="status" value="rad">{t("Rad etish")}</button>}
                  <button className="btn small ghost" type="submit" name="status" value="ochirish">{t("O'chirish")}</button>
                </form>
              </div>
            ))}
          </section>

          <form action={adminDeleteMaster} className="card section" style={{ alignItems: 'flex-start' }}>
            <input type="hidden" name="id" value={m.id} />
            <h2 className="h2">{t("Ustani o'chirish")}</h2>
            <label className="check"><input type="checkbox" required /> {t("Ha, butunlay o'chirmoqchiman")}</label>
            <button className="btn ghost small" type="submit" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t("O'chirish")}</button>
          </form>
        </>
      )}
    </AdminShell>
  );
}
