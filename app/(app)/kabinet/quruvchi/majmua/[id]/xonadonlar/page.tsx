import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShaxmatkaEditor from '@/components/shaxmatka/ShaxmatkaEditor';
import { requireUser } from '@/lib/supabase-server';
import { getShaxmatka } from '@/lib/shaxmatka-data';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function DevShaxmatka({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser(`/kabinet/quruvchi/majmua/${id}/xonadonlar`);
  const { data: c } = await sb.from('complexes').select('id, slug, name, price_m2, floors, published, developer_id').eq('id', id).maybeSingle();
  if (!c) notFound();
  const { data: mem } = await sb.from('developer_members').select('developer_id').eq('user_id', user.id).eq('developer_id', c.developer_id).maybeSingle();
  if (!mem) notFound();
  const data = await getShaxmatka(c.id, sb as never);
  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link href={`/kabinet/quruvchi/majmua/${c.id}`} style={{ textDecoration: 'none', fontSize: 14 }}>{t('← {name}', { name: c.name })}</Link>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t('Xonadonlar va 3D')}</h1>
        <ShaxmatkaEditor lang={lang} mode="dev" complex={{ ...c, price_m2: Number(c.price_m2) }} initial={data} userId={user.id} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
