import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUpload from '@/components/ImageUpload';
import CallHoursFields from '@/components/CallHoursFields';
import { requireUser } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { locale, T, tMsg } from '@/lib/i18n';
import { som } from '@/lib/format';
import { submitClaim, saveCompany, setLeadStatus } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: T(await getLang())('Quruvchi kabineti') };
}

const LEAD_STATUS: Record<string, string> = { yangi: 'Yangi', boglanildi: "Bog'lanildi", yopildi: 'Yopildi' };

type Dev = { id: string; name: string; slug: string; description: string; description_ru: string; phone: string | null; verified: boolean; call_days: number[]; call_from: string; call_to: string };

export default async function DeveloperCabinet({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser('/kabinet/quruvchi');

  const { data: mem } = await sb.from('developer_members').select('developers(id, name, slug, description, description_ru, verified, call_days, call_from, call_to)').eq('user_id', user.id);
  const devs0 = (mem || []).map((m) => m.developers as unknown as Dev).filter(Boolean);
  const devs = await Promise.all(devs0.map(async (d) => ({ ...d, phone: ((await sb.rpc('my_contact', { kind: 'quruvchi', rid: d.id })).data as string | null) ?? '' })));
  const tgUser = user.email?.endsWith('@telegram.uykor.uz');

  const notices = (
    <>
      {sp.saqlandi && <div className="success">{t('Saqlandi.')}</div>}
      {sp.yuborildi && <div className="success">{t("Arizangiz yuborildi. Uykor siz bilan bog'lanib, kompaniyangizni tekshiradi.")}</div>}
      {sp.xato && <div className="error" role="alert">{tMsg(t, sp.xato)}</div>}
    </>
  );

  // ---------- Not linked to a developer yet: request access ----------
  if (devs.length === 0) {
    const [{ data: claims }, { data: prof }, { data: allDevs }] = await Promise.all([
      sb.from('developer_claims').select('id, company_name, status, reject_reason, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      sb.from('profiles').select('full_name, phone, company').eq('id', user.id).maybeSingle(),
      sb.from('developers').select('id, name').eq('is_sample', false).order('name'),
    ]);
    const last = claims?.[0];
    const pending = last?.status === 'kutilmoqda';
    return (
      <>
        <Header lang={lang} active="kabinet" />
        <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820 }}>
          <Link href="/kabinet" style={{ textDecoration: 'none', fontSize: 14 }}>{t('← Kabinet')}</Link>
          <h1 className="display" style={{ margin: 0, fontSize: 30 }}>{t('Quruvchi kabineti')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("Bu yerda quruvchi kompaniya o'z majmualarini, narxlarni, bo'sh xonadonlarni va qurilish yangiliklarini o'zi kiritadi. Xaridorlar arizalari to'g'ridan-to'g'ri sizga keladi.")}</p>
          {notices}
          {pending ? (
            <div className="card section">
              <h2 className="h2">{t('Arizangiz tekshiruvda')}</h2>
              <span>{last.company_name}</span>
              <span className="muted">{t("Uykor kompaniya vakili ekaningizni tekshiradi, odatda bir ish kuni ichida. Tasdiqlangach, bu sahifada majmualaringizni boshqarasiz.")}</span>
            </div>
          ) : (
            <form action={submitClaim} className="card section" style={{ gap: 16 }}>
              {last?.status === 'rad' && <div className="error">{t('Oldingi ariza rad etildi')}{last.reject_reason ? `: ${last.reject_reason}` : '.'}</div>}
              <h2 className="h2">{t('Kompaniyangizni ulang')}</h2>
              <div className="form-grid">
                <div className="field"><label htmlFor="company_name">{t('Kompaniya nomi')}</label><input id="company_name" name="company_name" className="input" required minLength={2} maxLength={100} defaultValue={prof?.company || ''} /></div>
                <div className="field"><label htmlFor="developer_id">{t("Uykor'da sahifasi bormi?")}</label>
                  <select id="developer_id" name="developer_id" className="input" defaultValue="">
                    <option value="">{t("Yo'q, yangi sahifa ochilsin")}</option>
                    {(allDevs || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="contact_name">{t('Ismingiz')}</label><input id="contact_name" name="contact_name" className="input" required maxLength={80} defaultValue={prof?.full_name || ''} /></div>
                <div className="field"><label htmlFor="position">{t('Lavozimingiz')}</label><input id="position" name="position" className="input" maxLength={80} placeholder={t('masalan: sotuv bo\'limi boshlig\'i')} /></div>
                <div className="field"><label htmlFor="phone">{t('Telefon raqam')}</label><input id="phone" name="phone" type="tel" className="input" required maxLength={20} defaultValue={prof?.phone || ''} placeholder="+998 90 123 45 67" /></div>
              </div>
              <div className="field"><label htmlFor="note">{t('Izoh (ixtiyoriy)')}</label><textarea id="note" name="note" className="input" maxLength={1000} placeholder={t('Qaysi majmualarni qurayapsiz, sayt yoki Instagram sahifangiz...')} /></div>
              <ImageUpload lang={lang} name="doc_path" folder={`${user.id}/quruvchi`} bucket="hujjatlar" privateFile label={t('Guvohnoma yoki ishonchnoma rasmi (ixtiyoriy)')} />
              <span className="muted" style={{ fontSize: 13 }}>{t("Hujjatni faqat Uykor moderatori ko'radi va tekshiruvdan keyin o'chiriladi. Hujjat bo'lmasa, kompaniya telefoni orqali tekshiramiz.")}</span>
              <div><button type="submit" className="btn">{t('Ariza yuborish')}</button></div>
            </form>
          )}
        </main>
        <Footer lang={lang} />
      </>
    );
  }

  // ---------- Linked: manage complexes and leads ----------
  const devIds = devs.map((d) => d.id);
  const { data: complexes } = await sb.from('complexes').select('id, name, slug, district, price_m2, published, progress, developer_id').in('developer_id', devIds).order('created_at', { ascending: false });
  const cids = (complexes || []).map((c) => c.id);
  const { data: leads } = cids.length
    ? await sb.from('leads').select('id, name, phone, kind, status, created_at, complex_id').in('complex_id', cids).order('created_at', { ascending: false }).limit(100)
    : { data: [] as { id: string; name: string; phone: string; kind: string; status: string; created_at: string; complex_id: string }[] };
  const cname = Object.fromEntries((complexes || []).map((c) => [c.id, c.name]));
  const fresh = (leads || []).filter((l) => l.status === 'yangi').length;

  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Link href="/kabinet" style={{ textDecoration: 'none', fontSize: 14 }}>{t('← Kabinet')}</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 30 }}>{t('Quruvchi kabineti')}</h1>
          <Link href="/kabinet/quruvchi/majmua/yangi" className="btn">{t('+ Yangi majmua')}</Link>
        </div>
        {notices}
        {!tgUser && (
          <div className="notice">
            <span>{t("Yangi arizalarni Telegram'da darhol olish uchun \"Telegram orqali kirish\" bilan ham kiring va o'sha hisobdan shu kompaniyaga ulanish arizasini yuboring. Har bir xodim alohida ulanishi mumkin.")}</span>
          </div>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="h2">{t('Arizalar')} {fresh > 0 && <span className="chip warn">{t('{n} ta yangi', { n: fresh })}</span>}</h2>
          <div className="card table-wrap">
            <table className="t" style={{ minWidth: 720 }}>
              <thead><tr><th>{t('Sana')}</th><th>{t('Ism')}</th><th>{t('Telefon')}</th><th>{t('Majmua')}</th><th>{t('Turi')}</th><th>{t('Holati')}</th></tr></thead>
              <tbody>
                {(leads || []).length === 0 && <tr><td colSpan={6} className="muted">{t("Hozircha ariza yo'q. Xaridor majmua sahifasida \"Ko'rishga yozilish\" yoki \"Qo'ng'iroq so'rash\" tugmasini bosganda shu yerda paydo bo'ladi.")}</td></tr>}
                {(leads || []).map((l) => (
                  <tr key={l.id}>
                    <td className="muted">{new Date(l.created_at).toLocaleString(locale(lang), { timeZone: 'Asia/Samarkand', dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ fontWeight: 600 }}>{l.name}</td>
                    <td><a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} style={{ userSelect: 'all' }}>{l.phone}</a></td>
                    <td>{cname[l.complex_id] ?? '—'}</td>
                    <td>{l.kind === 'qongiroq' ? t("Qo'ng'iroq") : t("Ko'rish")}</td>
                    <td>
                      <form action={setLeadStatus} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="id" value={l.id} />
                        <select name="status" defaultValue={l.status} className="input" style={{ height: 36, width: 'auto' }} aria-label={t('Holati')}>
                          {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                        </select>
                        <button className="btn small ghost" type="submit">{t('Saqlash')}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="h2">{t('Majmualarim')}</h2>
          {(complexes || []).length === 0 && (
            <div className="card section" style={{ alignItems: 'flex-start' }}>
              <span className="muted">{t("Hali majmua qo'shilmagan.")}</span>
              <Link href="/kabinet/quruvchi/majmua/yangi" className="btn small">{t("Birinchi majmuani qo'shish")}</Link>
            </div>
          )}
          {(complexes || []).map((c) => (
            <Link key={c.id} href={`/kabinet/quruvchi/majmua/${c.id}`} className="card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
              <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <strong>{c.name}</strong>
                <span className="muted" style={{ fontSize: 13 }}>{[c.district, `${som(c.price_m2)} ${t("so'm")}/m²`, t('Qurilish {n}%', { n: c.progress })].filter(Boolean).join(' · ')}</span>
              </div>
              <span className={`chip ${c.published ? 'ok' : 'warn'}`}>{c.published ? t('Saytda') : t('Tekshiruvda')}</span>
            </Link>
          ))}
        </section>

        {devs.map((d) => (
          <form key={d.id} action={saveCompany} className="card section">
            <input type="hidden" name="id" value={d.id} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 className="h2">{t('Kompaniya sahifasi')}: {d.name}</h2>
              <Link href={`/quruvchi/${d.slug}`} target="_blank" className="btn ghost small">{t("Saytda ko'rish ↗")}</Link>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>{t("Reyting faktlarini (topshirilgan uylar, kadastr muddati, xaridorlar bahosi) Uykor hujjatlar asosida o'zi kiritadi, shuning uchun ularni bu yerda o'zgartirib bo'lmaydi.")}</span>
            <div className="field"><label htmlFor={`ph-${d.id}`}>{t('Sotuv bo\'limi telefoni')}</label><input id={`ph-${d.id}`} name="phone" type="tel" className="input" maxLength={20} defaultValue={d.phone ?? ''} /></div>
            <CallHoursFields lang={lang} value={d} idp={`${d.id}-`} />
            <div className="field"><label htmlFor={`de-${d.id}`}>{t("Kompaniya haqida (o'zbekcha)")}</label><textarea id={`de-${d.id}`} name="description" className="input" defaultValue={d.description} /></div>
            <div className="field"><label htmlFor={`dr-${d.id}`}>{t('Kompaniya haqida (ruscha, ixtiyoriy)')}</label><textarea id={`dr-${d.id}`} name="description_ru" className="input" defaultValue={d.description_ru} /></div>
            <div><button className="btn" type="submit">{t('Saqlash')}</button></div>
          </form>
        ))}
      </main>
      <Footer lang={lang} />
    </>
  );
}
