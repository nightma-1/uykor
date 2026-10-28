import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { requireUser, sessionClient } from '@/lib/supabase-server';
import { KINDS, priceText, STATUS_LABEL, type Listing } from '@/lib/listings';
import { getLang } from '@/lib/i18n-server';
import { T, tMsg } from '@/lib/i18n';
import { saveProfile } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: T(await getLang())('Kabinet') };
}

async function signOut() {
  'use server';
  const sb = await sessionClient();
  await sb.auth.signOut();
  redirect('/');
}

const STATUS_CHIP: Record<Listing['status'], string> = { qoralama: 'gray', moderatsiya: 'warn', faol: 'ok', rad: 'warn', arxiv: 'gray' };

export default async function Kabinet({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser('/kabinet');
  const [{ data: prof }, { data: listings }, { data: master }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    sb.from('listings').select('id, kind, title, price, currency, status, verification, reject_reason, views, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    sb.from('masters').select('id, name, status, views').eq('owner_id', user.id).maybeSingle(),
  ]);
  const needProfile = !prof || !prof.full_name || !prof.phone;

  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="display" style={{ margin: 0, fontSize: 30 }}>{t('Kabinet')}</h1>
            <span className="muted">{user.email?.endsWith('@telegram.uykor.uz') ? `Telegram${user.user_metadata?.tg_username ? ` · @${user.user_metadata.tg_username}` : ''}` : user.email}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!needProfile && <Link href="/kabinet/elon/yangi" className="btn">{t("+ Yangi e'lon")}</Link>}
            <form action={signOut}><button className="btn ghost" type="submit">{t('Chiqish')}</button></form>
          </div>
        </div>
        {sp.saqlandi && <div className="success">{t('Saqlandi.')}</div>}
        {sp.ochirildi && <div className="success">{t("O'chirildi.")}</div>}
        {sp.xato && <div className="error" role="alert">{tMsg(t, sp.xato)}</div>}

        <form action={saveProfile} className="card section">
          <input type="hidden" name="keyin" value={sp.keyin || ''} />
          <h2 className="h2">{needProfile ? t("Avval ma'lumotlaringizni kiriting") : t("Mening ma'lumotlarim")}</h2>
          {needProfile && <span className="muted" style={{ fontSize: 14 }}>{t("Ism va telefon raqam e'lonlaringizda ko'rsatiladi, xaridor yoki ijarachi sizga to'g'ridan-to'g'ri qo'ng'iroq qiladi.")}</span>}
          <div className="form-grid">
            <div className="field"><label htmlFor="full_name">{t('Ismingiz')}</label><input id="full_name" name="full_name" className="input" required defaultValue={prof?.full_name ?? ''} /></div>
            <div className="field"><label htmlFor="phone">{t('Telefon raqam')}</label><input id="phone" name="phone" className="input" type="tel" required placeholder="+998 90 123 45 67" defaultValue={prof?.phone ?? ''} /></div>
            <div className="field"><label htmlFor="account_type">{t('Siz kimsiz?')}</label>
              <select id="account_type" name="account_type" className="input" defaultValue={prof?.account_type ?? 'ega'}>
                <option value="ega">{t('Uy egasi')}</option>
                <option value="quruvchi">{t('Quruvchi kompaniya')}</option>
              </select>
            </div>
            <div className="field"><label htmlFor="company">{t('Kompaniya nomi (quruvchilar uchun)')}</label><input id="company" name="company" className="input" defaultValue={prof?.company ?? ''} /></div>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>{t("Uykor'da makler sifatida e'lon joylash taqiqlangan. Makler ekanligi aniqlangan hisoblar bloklanadi.")}</span>
          <div><button className="btn" type="submit">{t('Saqlash')}</button></div>
        </form>

        <section className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <h2 className="h2">♥ {t('Sevimlilar va eslatmalar')}</h2>
            <span className="muted" style={{ fontSize: 14 }}>{t("Saqlangan uylar, ustalar va yangi e'lonlar haqida Telegram eslatmalari.")}</span>
          </div>
          <Link href="/kabinet/sevimlilar" className="btn ghost small">{t('Ochish')}</Link>
        </section>

        {!needProfile && prof?.account_type === 'quruvchi' && (
          <section className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderColor: 'var(--lapis)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <h2 className="h2">{t('Quruvchi kabineti')}</h2>
              <span className="muted" style={{ fontSize: 14 }}>{t("Majmualaringiz, narxlar, bo'sh xonadonlar va xaridorlar arizalari.")}</span>
            </div>
            <Link href="/kabinet/quruvchi" className="btn small">{t('Ochish')}</Link>
          </section>
        )}

        {!needProfile && (
          <section className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <h2 className="h2">{t('Usta profili')}</h2>
              <span className="muted" style={{ fontSize: 14 }}>
                {master ? `${master.name} · ${t(STATUS_LABEL[master.status as Listing['status']])} · ${t("{n} ko'rish", { n: master.views })}` : t("Ta'mir, santexnika, elektrika kabi ishlarni qilsangiz, mijozlar sizni Ustalar bo'limida topadi.")}
              </span>
            </div>
            <Link href="/kabinet/usta" className={master ? 'btn ghost small' : 'btn small'}>{master ? t('Boshqarish') : t('Usta profilini ochish')}</Link>
          </section>
        )}

        {!needProfile && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="h2">{t("Mening e'lonlarim")}</h2>
            {(listings || []).length === 0 && (
              <div className="card section" style={{ alignItems: 'flex-start' }}>
                <span className="muted">{t("Hali e'lon yo'q.")}</span>
                <Link href="/kabinet/elon/yangi" className="btn small">{t("Birinchi e'lonni joylash")}</Link>
              </div>
            )}
            {(listings || []).map((l) => (
              <Link key={l.id} href={`/kabinet/elon/${l.id}`} className="card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <strong>{l.title}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{t(KINDS[l.kind as keyof typeof KINDS].title)} · {priceText(l as Listing, lang)} · {t("{n} ko'rish", { n: l.views })}</span>
                  {l.status === 'rad' && l.reject_reason && <span className="error" style={{ fontSize: 13 }}>{t('Rad sababi')}: {l.reject_reason}</span>}
                </div>
                <span className={`chip ${STATUS_CHIP[l.status as Listing['status']]}`}>{t(STATUS_LABEL[l.status as Listing['status']])}</span>
              </Link>
            ))}
          </section>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
}
