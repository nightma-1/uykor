import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TelegramLink from '@/components/TelegramLink';
import { requireUser } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { lp, T, tMsg } from '@/lib/i18n';
import { mln, som } from '@/lib/format';
import { priceText, roomsText, type ListingWithPhotos } from '@/lib/listings';
import { catLabel, ratingText, type MasterStats } from '@/lib/masters';
import { LISTING_COLS, MASTER_COLS } from '@/lib/contact';
import { addAlert, deleteAlert, removeFavorite } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: T(await getLang())('Sevimlilar va eslatmalar') };
}

const KIND_LABEL: Record<string, string> = { ijara: 'Ijara', kunlik: 'Kunlik', sotuv: 'Sotuv', majmua: 'Yangi majmualar' };

type Alert = { id: string; kind: string; rooms: number | null; max_price: number | null; currency: string; district: string };

export default async function Favorites({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser('/kabinet/sevimlilar');

  const [{ data: favs }, { data: alerts }, { data: tg }] = await Promise.all([
    sb.from('favorites').select('item_type, item_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    sb.from('alerts').select('id, kind, rooms, max_price, currency, district').eq('user_id', user.id).order('created_at'),
    sb.rpc('my_telegram'),
  ]);
  const ids = (type: string) => (favs || []).filter((f) => f.item_type === type).map((f) => f.item_id);
  const [cx, ls, ms, ap] = await Promise.all([
    ids('majmua').length ? sb.from('complexes').select('id, slug, name, district, price_m2, cover_url').in('id', ids('majmua')).eq('published', true) : Promise.resolve({ data: [] }),
    ids('elon').length ? sb.from('listings').select(`${LISTING_COLS}, listing_photos(id, url, sort)`).in('id', ids('elon')).eq('status', 'faol') : Promise.resolve({ data: [] }),
    ids('usta').length ? sb.from('master_stats').select(MASTER_COLS).in('id', ids('usta')).eq('status', 'faol') : Promise.resolve({ data: [] }),
    ids('xonadon').length ? sb.from('apartments').select('id, number, floor, rooms, area, status, price, complex:complexes(slug, name, price_m2, published)').in('id', ids('xonadon')) : Promise.resolve({ data: [] }),
  ]);
  type FavApt = { id: string; number: string; floor: number; rooms: number; area: number; status: string; price: number | null; complex: { slug: string; name: string; price_m2: number; published: boolean } | null };
  const apts = ((ap.data || []) as unknown as FavApt[]).filter((a) => a.complex?.published);
  const complexes = (cx.data || []) as { id: string; slug: string; name: string; district: string; price_m2: number; cover_url: string | null }[];
  const listings = (ls.data || []) as ListingWithPhotos[];
  const masters = (ms.data || []) as MasterStats[];
  const total = complexes.length + listings.length + masters.length + apts.length;
  const tgName = tg as string | null;

  // Prefill from the "notify me" links on listing pages.
  const preKind = ['ijara', 'kunlik', 'sotuv', 'majmua'].includes(sp.tur) ? sp.tur : 'ijara';

  const alertText = (a: Alert) => [
    t(KIND_LABEL[a.kind]),
    a.rooms ? (a.rooms === 4 ? t('4+ xonali') : t('{n} xonali', { n: a.rooms })) : '',
    a.max_price ? `${t('gacha')} ${a.currency === 'USD' ? `$${som(a.max_price)}` : a.kind === 'majmua' ? `${mln(a.max_price, 1)} ${t('mln/m²')}` : t('{n} mln so\'m', { n: mln(a.max_price, 1) })}` : '',
    a.district,
  ].filter(Boolean).join(' · ');

  const rm = (type: string, id: string) => (
    <form action={removeFavorite}><input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} /><button type="submit" className="btn ghost small">{t('Olib tashlash')}</button></form>
  );

  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 980 }}>
        <Link href="/kabinet" style={{ textDecoration: 'none', fontSize: 14 }}>{t('← Kabinet')}</Link>
        <h1 className="display" style={{ margin: 0, fontSize: 30 }}>{t('Sevimlilar va eslatmalar')}</h1>
        {sp.eslatma && <div className="success">{t("Eslatma saqlandi. Mos e'lon chiqishi bilan Telegram'ga xabar keladi.")}</div>}
        {sp.xato && <div className="error" role="alert">{tMsg(t, sp.xato)}</div>}

        <section className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 300px' }}>
            <h2 className="h2">Telegram</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {tgName
                ? `${t('Ulangan')}${tgName !== 'ulangan' ? `: @${tgName}` : ''}. ${t("Narx tushsa yoki mos yangi e'lon chiqsa, @UykorBot xabar beradi.")}`
                : t("Eslatmalar @UykorBot orqali keladi. Telegram'ni hisobingizga bir marta ulang.")}
            </span>
          </div>
          {!tgName && <TelegramLink lang={lang} />}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="h2">{t('Eslatmalar')}</h2>
          {(alerts || []).map((a) => (
            <div key={a.id} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>🔔 {alertText(a as Alert)}</span>
              <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><button type="submit" className="btn ghost small">{t("O'chirish")}</button></form>
            </div>
          ))}
          <form action={addAlert} className="card section" style={{ gap: 14 }}>
            <strong>{t("Yangi e'lon chiqsa xabar berilsin")}</strong>
            <div className="form-grid">
              <div className="field"><label htmlFor="a-kind">{t("Bo'lim")}</label>
                <select id="a-kind" name="kind" className="input" defaultValue={preKind}>
                  {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="a-rooms">{t('Xonalar')}</label>
                <select id="a-rooms" name="rooms" className="input" defaultValue={sp.xona || ''}>
                  <option value="">{t("Farqi yo'q")}</option>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 4 ? '4+' : n}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="a-price">{t('Narx gacha')}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input id="a-price" name="max_price" className="input" inputMode="decimal" defaultValue={sp.narx || ''} placeholder={t('mln so\'m yoki $')} />
                  <select name="currency" className="input" style={{ width: 84 }} aria-label={t('Valyuta')} defaultValue={sp.valyuta === 'USD' ? 'USD' : 'UZS'}>
                    <option value="UZS">{t('mln')}</option>
                    <option value="USD">$</option>
                  </select>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{t("Yangi majmualar uchun: 1 m² narxi, mln so'm")}</span>
              </div>
              <div className="field"><label htmlFor="a-district">{t("Hudud yoki ko'cha")}</label><input id="a-district" name="district" className="input" maxLength={60} defaultValue={sp.hudud || ''} placeholder={t('masalan Sattepo')} /></div>
            </div>
            <div><button type="submit" className="btn">{t("Eslatma qo'shish")}</button></div>
          </form>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="h2">{t('Saqlanganlar')} ({total})</h2>
          {total === 0 && (
            <div className="card section" style={{ alignItems: 'flex-start' }}>
              <span className="muted">{t("Hali hech narsa saqlanmagan. Majmua, e'lon yoki usta sahifasidagi ♥ tugmasini bosing.")}</span>
              <Link href={lp(lang, '/')} className="btn small">{t('Uylarni ko\'rish')}</Link>
            </div>
          )}
          {complexes.map((c) => (
            <div key={c.id} className="card fav-row">
              <Link href={lp(lang, `/jk/${c.slug}`)} className="fav-link">
                <div className="fav-thumb">{c.cover_url && <img src={c.cover_url} alt="" loading="lazy" />}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{c.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{t('Majmua')} · {c.district} · {mln(c.price_m2, 1)} {t('mln/m²')}</div>
                </div>
              </Link>
              {rm('majmua', c.id)}
            </div>
          ))}
          {apts.map((a) => (
            <div key={a.id} className="card fav-row">
              <Link href={lp(lang, `/jk/${a.complex!.slug}/xonadon/${a.id}`)} className="fav-link">
                <div className="fav-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>№ {a.number}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{a.complex!.name}: {t('{n} xonali', { n: a.rooms })}, {Number(a.area)} m²</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{t('Xonadon')} · {t('{n}-qavat', { n: a.floor })} · {t(a.status === 'sotuvda' ? 'Sotuvda' : a.status === 'bron' ? 'Bron' : a.status === 'sotilgan' ? 'Sotilgan' : 'Sotuvda emas')}</div>
                  <div className="num" style={{ fontWeight: 700 }}>{t("{n} mln so'm", { n: mln(a.price ?? Number(a.area) * a.complex!.price_m2, 1) })}</div>
                </div>
              </Link>
              {rm('xonadon', a.id)}
            </div>
          ))}
          {listings.map((l) => (
            <div key={l.id} className="card fav-row">
              <Link href={lp(lang, `/elon/${l.id}`)} className="fav-link">
                <div className="fav-thumb">{l.listing_photos[0] && <img src={[...l.listing_photos].sort((a, b) => a.sort - b.sort)[0].url} alt="" loading="lazy" />}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{l.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{[t(KIND_LABEL[l.kind]), roomsText(l, lang)].filter(Boolean).join(' · ')}</div>
                  <div className="num" style={{ fontWeight: 700 }}>{priceText(l, lang)}</div>
                </div>
              </Link>
              {rm('elon', l.id)}
            </div>
          ))}
          {masters.map((m) => (
            <div key={m.id} className="card fav-row">
              <Link href={lp(lang, `/usta/${m.id}`)} className="fav-link">
                <div className="fav-thumb">{m.avatar_url && <img src={m.avatar_url} alt="" loading="lazy" />}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{m.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{m.categories.slice(0, 2).map((c) => catLabel(c, lang)).join(', ')} · {ratingText(m, lang)}</div>
                </div>
              </Link>
              {rm('usta', m.id)}
            </div>
          ))}
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}
