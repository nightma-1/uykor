import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComplexEditor, { type FullComplex } from '@/components/ComplexEditor';
import { requireUser } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { saveComplex, addUnit, deleteUnit, addProgress, deleteProgress, addNearby, deleteNearby, addPhoto, deletePhoto } from '../../actions';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function DevComplex({ params, searchParams }: P) {
  const { id } = await params;
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireUser(`/kabinet/quruvchi/majmua/${id}`);

  const { data: mem } = await sb.from('developer_members').select('developers(id, name)').eq('user_id', user.id);
  const devs = (mem || []).map((m) => m.developers as unknown as { id: string; name: string }).filter(Boolean);
  if (devs.length === 0) redirect('/kabinet/quruvchi');

  const isNew = id === 'yangi';
  let c: FullComplex | null = null;
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const { data } = await sb.from('complexes').select('*, unit_types(*), progress_updates(*), nearby(*), complex_photos(*)').eq('id', id).maybeSingle();
    if (!data || !devs.some((d) => d.id === data.developer_id)) notFound();
    c = data as FullComplex;
  }

  return (
    <>
      <Header lang={lang} active="kabinet" />
      <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link href="/kabinet/quruvchi" style={{ textDecoration: 'none', fontSize: 14 }}>{t('← Quruvchi kabineti')}</Link>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{isNew ? t('Yangi majmua') : c?.name}</h1>
        {sp.saqlandi && <div className="success">{t('Saqlandi. Saytda 1 daqiqa ichida yangilanadi.')}</div>}
        {sp.xato && <div className="error" role="alert">{t('Saqlanmadi:')} {sp.xato}</div>}
        {isNew && <div className="notice">{t("Yangi majmua Uykor tekshiruvidan keyin saytda ko'rinadi. Keyingi o'zgarishlar (narx, bo'sh xonadonlar, qurilish foizi) darhol saytga chiqadi.")}</div>}
        <ComplexEditor
          mode="dev"
          lang={lang}
          c={c}
          devs={devs}
          userId={user.id}
          actions={{ saveComplex, addUnit, deleteUnit, addProgress, deleteProgress, addNearby, deleteNearby, addPhoto, deletePhoto }}
        />
      </main>
      <Footer lang={lang} />
    </>
  );
}
