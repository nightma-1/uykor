import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShaxmatkaEditor from '@/components/shaxmatka/ShaxmatkaEditor';
import { requireUser } from '@/lib/supabase-server';
import { getShaxmatka } from '@/lib/shaxmatka-data';
import { getLang } from '@/lib/i18n-server';
import { T, tMsg } from '@/lib/i18n';
import { confirmStock } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function DevShaxmatka({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser(`/kabinet/quruvchi/majmua/${id}/xonadonlar`);
  const { data: c } = await sb.from('complexes').select('id, slug, name, price_m2, floors, published, developer_id').eq('id', id).maybeSingle();
  if (!c) notFound();
  const { data: mem } = await sb.from('developer_members').select('developer_id').eq('user_id', user.id).eq('developer_id', c.developer_id).maybeSingle();
  if (!mem) notFound();
  const data = await getShaxmatka(c.id, sb as never);
  const { data: st } = await sb.from('complex_stock').select('updated_at, total').eq('complex_id', c.id).maybeSingle();
  const days = st?.updated_at ? Math.max(0, Math.floor((Date.now() - Date.parse(st.updated_at as string)) / 86_400_000)) : null;
  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link href={`/kabinet/quruvchi/majmua/${c.id}`} style={{ textDecoration: 'none', fontSize: 14 }}>{t('← {name}', { name: c.name })}</Link>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t('Xonadonlar va 3D')}</h1>
        {sp.ok === 'dolzarb' && <div className="success">{t("Rahmat! Xaridorlar endi ma'lumot bugun yangilanganini ko'radi.")}</div>}
        {sp.xato && <div className="error" role="alert">{tMsg(t, sp.xato)}</div>}
        {st && Number(st.total) > 0 && (
          <div className="card" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ flex: '1 1 260px' }}>
              <b>{days === 0 ? t('Bugun yangilangan') : t('{n} kun oldin yangilangan', { n: days ?? 0 })}</b>
              <span className="muted"> · {t("Xonadonni bosib holatini o'zgartiring (sotildi, bron). O'zgarish bo'lmasa — bitta tugma bilan tasdiqlang.")}</span>
            </span>
            <form action={confirmStock}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="back" value="xonadonlar" />
              <button type="submit" className="btn">{t('✓ Hammasi dolzarb')}</button>
            </form>
          </div>
        )}
        <ShaxmatkaEditor lang={lang} mode="dev" complex={{ ...c, price_m2: Number(c.price_m2) }} initial={data} userId={user.id} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
