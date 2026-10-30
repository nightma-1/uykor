import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import ShaxmatkaEditor from '@/components/shaxmatka/ShaxmatkaEditor';
import { requireAdmin } from '@/lib/supabase-server';
import { getShaxmatka } from '@/lib/shaxmatka-data';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminShaxmatka({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const { data: c } = await sb.from('complexes').select('id, slug, name, price_m2, floors, published').eq('id', id).maybeSingle();
  if (!c) notFound();
  const data = await getShaxmatka(c.id, sb as never);
  return (
    <AdminShell email={user.email ?? ''}>
      <Link href={`/admin/majmualar/${c.id}`} style={{ textDecoration: 'none', fontSize: 14 }}>{t('← {name}', { name: c.name })}</Link>
      <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t('Xonadonlar va 3D')}</h1>
      <ShaxmatkaEditor lang={lang} mode="admin" complex={{ ...c, price_m2: Number(c.price_m2) }} initial={data} userId={user.id} />
    </AdminShell>
  );
}
