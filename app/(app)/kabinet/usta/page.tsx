import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';
import CallHoursFields from '@/components/CallHoursFields';
import { MASTER_TABLE_COLS } from '@/lib/contact';
import { requireUser } from '@/lib/supabase-server';
import { STATUS_LABEL } from '@/lib/listings';
import { CATEGORIES, type Master } from '@/lib/masters';
import { getLang } from '@/lib/i18n-server';
import { T, tMsg } from '@/lib/i18n';
import { saveMaster, addMasterPhoto, deleteMasterPhoto, addMasterDoc, deleteMasterDoc, submitMaster, setMasterStatus, deleteMaster } from '../usta-actions';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: T(await getLang())('Usta profilim') };
}

export default async function MyMaster({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser('/kabinet/usta');
  const [{ data: prof }, { data: mr }] = await Promise.all([
    sb.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    sb.from('masters').select(MASTER_TABLE_COLS).eq('owner_id', user.id).maybeSingle(),
  ]);
  if (!prof?.full_name || !prof?.phone) redirect(`/kabinet?keyin=${encodeURIComponent('/kabinet/usta')}`);
  const myPhone = mr ? (await sb.rpc('my_contact', { kind: 'usta', rid: (mr as unknown as Master).id })).data as string | null : null;
  const m = mr ? ({ ...(mr as unknown as Master), phone: myPhone ?? '' }) : null;
  let photos: { id: string; url: string }[] = [];
  let docs: { id: string }[] = [];
  if (m) {
    const [{ data: ph }, { data: dc }] = await Promise.all([
      sb.from('master_photos').select('id, url').eq('master_id', m.id).order('sort'),
      sb.from('master_docs').select('id').eq('master_id', m.id),
    ]);
    photos = ph || [];
    docs = dc || [];
  }
  const editable = !m || m.status !== 'moderatsiya';
  const verified = m?.verification === 'tasdiqlangan';
  const folder = `${user.id}/usta`;

  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
        <Link href="/kabinet" style={{ textDecoration: 'none', fontSize: 14 }}>← {t('Kabinet')}</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{m ? t('Usta profilim') : t("Usta sifatida qo'shilish")}</h1>
          {m && <span className={`chip ${m.status === 'faol' ? 'ok' : m.status === 'moderatsiya' || m.status === 'rad' ? 'warn' : 'gray'}`}>{t(STATUS_LABEL[m.status])}</span>}
        </div>
        {!m && <p className="muted" style={{ margin: 0 }}>{t("Profil bepul. Mijozlar sizni yo'nalish bo'yicha topadi va to'g'ridan-to'g'ri qo'ng'iroq qiladi.")}</p>}

        {sp.xato && <div className="error" role="alert">{tMsg(t, sp.xato)}</div>}
        {sp.saqlandi && <div className="success">{t('Saqlandi.')}</div>}
        {sp.yangi && <div className="success">{t("Profil yaratildi. Endi ish rasmlari va pasportingizni qo'shing, keyin tekshiruvga yuboring.")}</div>}
        {sp.yuborildi && <div className="success">{t("Tekshiruvga yuborildi. Odatda bir kun ichida ko'rib chiqamiz.")}</div>}
        {m?.status === 'rad' && m.reject_reason && <div className="error">{t('Rad etildi')}: {m.reject_reason}. {t('Tuzatib, qayta yuboring.')}</div>}
        {m?.status === 'moderatsiya' && <div className="card section"><span>{t("Profil tekshiruvda. Bu vaqtda uni o'zgartirib bo'lmaydi.")}</span></div>}
        {m?.status === 'faol' && <div className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}><span>{t('Profilingiz saytda.')}</span><Link href={lang === 'ru' ? `/ru/usta/${m.id}` : `/usta/${m.id}`} className="btn small ghost">{t("Saytda ko'rish")}</Link></div>}

        {editable && (
          <form action={saveMaster} className="card section" style={{ gap: 18 }}>
            <div className="form-grid">
              <div className="field"><label htmlFor="name">{t('Ism-familiya yoki brigada nomi')}</label><input id="name" name="name" className="input" required maxLength={80} defaultValue={m?.name ?? prof.full_name} /></div>
              <div className="field"><label htmlFor="phone">{t('Telefon')}</label><input id="phone" name="phone" className="input" type="tel" required defaultValue={m?.phone ?? prof.phone} /></div>
              <div className="field"><label htmlFor="experience_years">{t('Tajriba, yil')}</label><input id="experience_years" name="experience_years" className="input" inputMode="numeric" defaultValue={m?.experience_years ?? ''} /></div>
              <div className="field"><label htmlFor="price_note">{t('Narx (ixtiyoriy)')}</label><input id="price_note" name="price_note" className="input" maxLength={80} placeholder={t("masalan: chaqiruv 100 000 so'mdan")} defaultValue={m?.price_note ?? ''} /></div>
            </div>
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>{t("Yo'nalishlar (bir nechtasini tanlash mumkin)")}</legend>
              <div className="form-grid" style={{ gap: '0 14px' }}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <label key={k} className="check"><input type="checkbox" name="categories" value={k} defaultChecked={m?.categories.includes(k)} /> {t(v)}</label>
                ))}
              </div>
            </fieldset>
            <div className="field"><label htmlFor="districts">{t('Qaysi hududlarda ishlaysiz')}</label><input id="districts" name="districts" className="input" maxLength={160} placeholder={t("masalan: butun Samarqand shahri, Kattaqo'rg'on")} defaultValue={m?.districts ?? ''} /></div>
            <div className="field"><label htmlFor="description">{t("O'zingiz haqingizda")}</label><textarea id="description" name="description" className="input" maxLength={3000} style={{ minHeight: 140 }} placeholder={t("Qanday ishlarni qilasiz, kafolat berasizmi, o'z asboblaringiz bormi...")} defaultValue={m?.description ?? ''} /></div>
            <ImageUpload lang={lang} name="avatar_url" bucket="elonlar" folder={folder} defaultUrl={m?.avatar_url ?? ''} label={t('Rasmingiz (ixtiyoriy)')} />
            <CallHoursFields lang={lang} value={m} />
            <div><button className="btn" type="submit">{m ? t('Saqlash') : t('Profil yaratish')}</button></div>
          </form>
        )}

        {m && editable && (
          <>
            <section className="card section">
              <h2 className="h2">{t('Bajargan ishlaringiz')} ({photos.length}/20)</h2>
              <span className="muted" style={{ fontSize: 14 }}>{t("Oldin va keyin rasmlari mijozlarni eng ko'p ishontiradi.")}</span>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 150 }}>
                    <img src={p.url} alt="" style={{ width: 150, height: 104, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }} />
                    <form action={deleteMasterPhoto}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="url" value={p.url} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
                  </div>
                ))}
              </div>
              {photos.length < 20 && (
                <form action={addMasterPhoto}>
                  <ImageUpload lang={lang} name="url" bucket="elonlar" folder={folder} label={t("Rasm qo'shish")} autoSubmit />
                </form>
              )}
            </section>

            {!verified && (
              <section className="card section">
                <h2 className="h2">{t('Shaxsingizni tasdiqlash')}</h2>
                <span className="muted" style={{ fontSize: 14 }}>{t('Pasportingizning ism-familiya sahifasi rasmini yuklang. Uni faqat Uykor moderatori ko\'radi va tekshiruvdan keyin darhol o\'chiriladi. Saytda faqat "Tekshirilgan usta" belgisi qoladi.')}</span>
                {docs.map((d) => (
                  <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="chip ok">{t('Pasport yuklandi')}</span>
                    <form action={deleteMasterDoc}><input type="hidden" name="id" value={d.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
                  </div>
                ))}
                {docs.length === 0 && (
                  <form action={addMasterDoc}>
                    <ImageUpload lang={lang} name="path" bucket="hujjatlar" privateFile folder={folder} label={t('Pasport (ism-familiya sahifasi)')} autoSubmit />
                  </form>
                )}
              </section>
            )}

            {m.status !== 'faol' && m.status !== 'arxiv' && (
              <form action={submitMaster} className="card section" style={{ alignItems: 'flex-start' }}>
                <h2 className="h2">{t('Tekshiruvga yuborish')}</h2>
                <span className="muted" style={{ fontSize: 14 }}>{t('Moderator tekshirgach, profilingiz "Ustalar" bo\'limida paydo bo\'ladi.')}</span>
                <button className="btn" type="submit">{t('Tekshiruvga yuborish')}</button>
              </form>
            )}
          </>
        )}

        {m && (m.status === 'faol' || m.status === 'arxiv') && (
          <form action={setMasterStatus} className="card section" style={{ alignItems: 'flex-start' }}>
            <input type="hidden" name="status" value={m.status === 'faol' ? 'arxiv' : 'faol'} />
            <h2 className="h2">{m.status === 'faol' ? t('Vaqtincha ishlamayapsizmi?') : t('Profilni qayta yoqish')}</h2>
            <span className="muted" style={{ fontSize: 14 }}>{m.status === 'faol' ? t("Yashirsangiz, profil saytda ko'rinmaydi. Sharhlar saqlanib qoladi.") : t("Profil tekshiruvsiz yana saytda ko'rinadi.")}</span>
            <button className="btn ghost" type="submit">{m.status === 'faol' ? t('Yashirish') : t('Saytga qaytarish')}</button>
          </form>
        )}

        {m && m.status !== 'moderatsiya' && (
          <form action={deleteMaster} className="card section" style={{ alignItems: 'flex-start' }}>
            <h2 className="h2">{t("Profilni o'chirish")}</h2>
            <span className="muted" style={{ fontSize: 14 }}>{t("Profil, rasmlar va sharhlar butunlay o'chadi.")}</span>
            <label className="check"><input type="checkbox" required /> {t("Ha, butunlay o'chirmoqchiman")}</label>
            <button className="btn ghost small" type="submit" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t("O'chirish")}</button>
          </form>
        )}
      </main>
    </>
  );
}
