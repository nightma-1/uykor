import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import ImageUpload from '@/components/ImageUpload';
import LocationPicker from '@/components/LocationPicker';
import CallHoursFields from '@/components/CallHoursFields';
import { LISTING_COLS } from '@/lib/contact';
import { requireUser } from '@/lib/supabase-server';
import { KINDS, STATUS_LABEL, type Listing, type ListingKind } from '@/lib/listings';
import { getLang } from '@/lib/i18n-server';
import { T, tMsg } from '@/lib/i18n';
import { saveListing, addListingPhoto, deleteListingPhoto, addDoc, deleteDoc, submitListing, setListingStatus, deleteListing } from '../../actions';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: T(await getLang())("E'lon") };
}

type P = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

const DOC_LABEL: Record<string, string> = { kadastr: 'Kadastr hujjati', pasport: 'Pasport', boshqa: 'Boshqa hujjat' };
const KIND_LABEL: Record<string, string> = { ijara: 'Uzoq muddatli ijara', kunlik: 'Kunlik ijara', sotuv: 'Sotuv' };

export default async function EditListing({ params, searchParams }: P) {
  const { id } = await params;
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser(`/kabinet/elon/${id}`);
  const isNew = id === 'yangi';

  const { data: prof } = await sb.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
  if (!prof?.full_name || !prof?.phone) redirect(`/kabinet?keyin=${encodeURIComponent(`/kabinet/elon/${id}`)}`);

  let l: Listing | null = null;
  let photos: { id: string; url: string }[] = [];
  let docs: { id: string; kind: string }[] = [];
  if (!isNew) {
    const [{ data: lr }, { data: ph }, { data: dc }, { data: phone }] = await Promise.all([
      sb.from('listings').select(LISTING_COLS).eq('id', id).eq('owner_id', user.id).maybeSingle(),
      sb.from('listing_photos').select('id, url, sort').eq('listing_id', id).order('sort'),
      sb.from('listing_docs').select('id, kind').eq('listing_id', id),
      sb.rpc('my_contact', { kind: 'elon', rid: id }),
    ]);
    if (!lr) redirect('/kabinet');
    l = { ...(lr as unknown as Listing), phone: (phone as string | null) ?? '' };
    photos = ph || [];
    docs = dc || [];
  }
  const kind = (l?.kind ?? (['ijara', 'kunlik', 'sotuv'].includes(sp.tur) ? sp.tur : 'ijara')) as ListingKind;
  const v = (k: keyof Listing) => (l ? (l[k] ?? '') : '') as string | number;
  const verified = l?.verification === 'tasdiqlangan';
  const editable = !l || l.status !== 'moderatsiya';
  const hasDoc = (k: string) => docs.some((d) => d.kind === k);

  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
        <Link href="/kabinet" style={{ textDecoration: 'none', fontSize: 14 }}>← {t('Kabinet')}</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{isNew ? t("Yangi e'lon") : String(v('title'))}</h1>
          {l && <span className={`chip ${l.status === 'faol' ? 'ok' : l.status === 'moderatsiya' || l.status === 'rad' ? 'warn' : 'gray'}`}>{t(STATUS_LABEL[l.status])}</span>}
        </div>

        {sp.xato && <div className="error" role="alert">{tMsg(t, sp.xato)}</div>}
        {sp.saqlandi && <div className="success">{t('Saqlandi.')}</div>}
        {sp.yangi && <div className="success">{t("E'lon yaratildi. Endi rasmlar va hujjatlarni qo'shing, keyin tekshiruvga yuboring.")}</div>}
        {sp.yuborildi && <div className="success">{t("Tekshiruvga yuborildi. Odatda bir kun ichida ko'rib chiqamiz.")}</div>}
        {l?.status === 'rad' && l.reject_reason && <div className="error">{t('Rad etildi')}: {l.reject_reason}. {t('Tuzatib, qayta yuboring.')}</div>}
        {l?.status === 'moderatsiya' && <div className="card section"><span>{t("E'lon tekshiruvda. Bu vaqtda uni o'zgartirib bo'lmaydi.")}</span></div>}

        {editable && (
          <form action={saveListing} className="card section" style={{ gap: 18 }}>
            <input type="hidden" name="id" value={isNew ? '' : id} />
            <div className="field">
              <span className="label" id="kind-l">{t("E'lon turi")}</span>
              <div className="seg" role="radiogroup" aria-labelledby="kind-l">
                {(Object.keys(KINDS) as ListingKind[]).map((k) => (
                  <label key={k} className="check" style={{ flex: '1 1 auto', border: '1px solid var(--line-strong)', borderRadius: 10, padding: '0 12px' }}>
                    <input type="radio" name="kind" value={k} defaultChecked={k === kind} /> {t(KIND_LABEL[k])}
                  </label>
                ))}
              </div>
            </div>
            <div className="field"><label htmlFor="title">{t('Sarlavha')}</label><input id="title" name="title" className="input" required minLength={5} maxLength={120} placeholder={t('masalan: 2 xonali kvartira, Sattepo, remont qilingan')} defaultValue={String(v('title'))} /></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="price">{t('Narx')}</label><input id="price" name="price" className="input" inputMode="numeric" required placeholder={t('masalan 4500000')} defaultValue={String(v('price'))} /></div>
              <div className="field"><label htmlFor="currency">{t('Valyuta')}</label>
                <select id="currency" name="currency" className="input" defaultValue={String(v('currency') || (kind === 'sotuv' ? 'USD' : 'UZS'))}><option value="UZS">{t("so'm")}</option><option value="USD">{t('$ (dollar)')}</option></select></div>
              <div className="field"><label htmlFor="rooms">{t('Xonalar soni')}</label><input id="rooms" name="rooms" className="input" inputMode="numeric" defaultValue={String(v('rooms'))} /></div>
              <div className="field"><label htmlFor="area">{t('Maydon, m²')}</label><input id="area" name="area" className="input" inputMode="decimal" defaultValue={String(v('area'))} /></div>
              <div className="field"><label htmlFor="floor">{t('Qavat')}</label><input id="floor" name="floor" className="input" inputMode="numeric" defaultValue={String(v('floor'))} /></div>
              <div className="field"><label htmlFor="floors_total">{t('Uy necha qavatli')}</label><input id="floors_total" name="floors_total" className="input" inputMode="numeric" defaultValue={String(v('floors_total'))} /></div>
              <div className="field"><label htmlFor="district">{t('Hudud / mahalla')}</label><input id="district" name="district" className="input" placeholder={t('masalan Sattepo')} defaultValue={String(v('district'))} /></div>
              <div className="field"><label htmlFor="address">{t('Manzil (ixtiyoriy)')}</label><input id="address" name="address" className="input" defaultValue={String(v('address'))} /></div>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>{t('Ijara narxi oyiga, kunlik ijara narxi kuniga yoziladi.')}</span>
            <LocationPicker lang={lang} lat={l?.lat ?? null} lng={l?.lng ?? null} />
            <div className="field"><label htmlFor="description">{t('Tavsif')}</label><textarea id="description" name="description" className="input" maxLength={4000} style={{ minHeight: 140 }} placeholder={t("Remont, jihozlar, kimlar uchun, qo'shimcha to'lovlar...")} defaultValue={String(v('description'))} /></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="contact_name">{t('Aloqa uchun ism')}</label><input id="contact_name" name="contact_name" className="input" defaultValue={String(v('contact_name') || prof.full_name)} /></div>
              <div className="field"><label htmlFor="phone">{t('Telefon')}</label><input id="phone" name="phone" className="input" type="tel" defaultValue={String(v('phone') || prof.phone)} /></div>
            </div>
            <CallHoursFields lang={lang} value={l} />
            <div><button className="btn" type="submit">{isNew ? t('Saqlash va davom etish') : t('Saqlash')}</button></div>
          </form>
        )}

        {l && editable && (
          <>
            <section className="card section">
              <h2 className="h2">{t('Rasmlar')} ({photos.length}/15)</h2>
              <span className="muted" style={{ fontSize: 14 }}>{t("Birinchi rasm ro'yxatda ko'rinadi. Yorug' va aniq rasmlar ko'proq qo'ng'iroq olib keladi.")}</span>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {photos.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 150 }}>
                    <img src={p.url} alt="" style={{ width: 150, height: 104, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }} />
                    {i === 0 && <span className="chip blue" style={{ alignSelf: 'flex-start' }}>{t('Asosiy')}</span>}
                    <form action={deleteListingPhoto}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="url" value={p.url} /><input type="hidden" name="listing_id" value={l.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
                  </div>
                ))}
              </div>
              {photos.length < 15 && (
                <form action={addListingPhoto}>
                  <input type="hidden" name="listing_id" value={l.id} />
                  <ImageUpload lang={lang} name="url" bucket="elonlar" folder={`${user.id}/${l.id}`} label={t("Rasm qo'shish")} autoSubmit />
                </form>
              )}
            </section>

            {!verified && (
              <section className="card section">
                <h2 className="h2">{t('Egalikni tasdiqlash')}</h2>
                <span className="muted" style={{ fontSize: 14 }}>
                  {t('Makler emasligingizni tekshirish uchun kadastr hujjati va pasportingiz rasmini yuklang. Ularni faqat Uykor moderatori ko\'radi va tekshiruvdan keyin darhol o\'chiriladi. Saytda faqat "Egasi tekshirilgan" belgisi qoladi.')}
                </span>
                {docs.map((d) => (
                  <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="chip ok">{t('{doc} yuklandi', { doc: t(DOC_LABEL[d.kind] ?? d.kind) })}</span>
                    <form action={deleteDoc}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="listing_id" value={l.id} /><button className="btn small ghost" type="submit">{t("O'chirish")}</button></form>
                  </div>
                ))}
                <div className="form-grid">
                  {!hasDoc('kadastr') && (
                    <form action={addDoc}>
                      <input type="hidden" name="listing_id" value={l.id} /><input type="hidden" name="kind" value="kadastr" />
                      <ImageUpload lang={lang} name="path" bucket="hujjatlar" privateFile folder={`${user.id}/${l.id}`} label={t("Kadastr hujjati (egasining ismi ko'rinsin)")} autoSubmit />
                    </form>
                  )}
                  {!hasDoc('pasport') && (
                    <form action={addDoc}>
                      <input type="hidden" name="listing_id" value={l.id} /><input type="hidden" name="kind" value="pasport" />
                      <ImageUpload lang={lang} name="path" bucket="hujjatlar" privateFile folder={`${user.id}/${l.id}`} label={t('Pasport (ism-familiya sahifasi)')} autoSubmit />
                    </form>
                  )}
                </div>
              </section>
            )}

            {l.status !== 'faol' && (
              <form action={submitListing} className="card section" style={{ alignItems: 'flex-start' }}>
                <input type="hidden" name="listing_id" value={l.id} />
                <h2 className="h2">{t('Tekshiruvga yuborish')}</h2>
                <span className="muted" style={{ fontSize: 14 }}>{t("Moderator ma'lumotlarni tekshirgach, e'lon saytda paydo bo'ladi.")}</span>
                <button className="btn" type="submit">{t('Tekshiruvga yuborish')}</button>
              </form>
            )}
          </>
        )}

        {l && (l.status === 'faol' || l.status === 'arxiv') && (
          <form action={setListingStatus} className="card section" style={{ alignItems: 'flex-start' }}>
            <input type="hidden" name="listing_id" value={l.id} />
            <input type="hidden" name="status" value={l.status === 'faol' ? 'arxiv' : 'faol'} />
            <h2 className="h2">{l.status === 'faol' ? t("Uy band bo'ldimi?") : t("E'lonni qayta yoqish")}</h2>
            <span className="muted" style={{ fontSize: 14 }}>{l.status === 'faol' ? t("Arxivga olsangiz, e'lon saytdan yashiriladi. Keyin qayta yoqishingiz mumkin.") : t("E'lon tekshiruvsiz yana saytda ko'rinadi.")}</span>
            <button className="btn ghost" type="submit">{l.status === 'faol' ? t('Arxivga olish') : t('Saytga qaytarish')}</button>
          </form>
        )}

        {l && l.status !== 'moderatsiya' && (
          <form action={deleteListing} className="card section" style={{ alignItems: 'flex-start' }}>
            <input type="hidden" name="listing_id" value={l.id} />
            <h2 className="h2">{t("E'lonni o'chirish")}</h2>
            <label className="check"><input type="checkbox" required /> {t("Ha, butunlay o'chirmoqchiman")}</label>
            <button className="btn ghost small" type="submit" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t("O'chirish")}</button>
          </form>
        )}
      </main>
    </>
  );
}
