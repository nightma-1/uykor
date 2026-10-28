import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import ComplexEditor, { type FullComplex } from '@/components/ComplexEditor';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { saveComplex, deleteComplex, addUnit, deleteUnit, addProgress, deleteProgress, addNearby, deleteNearby, addPhoto, deletePhoto } from '../../actions';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function EditComplex({ params, searchParams }: P) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const isNew = id === 'yangi';
  const [{ data: devs }, { data: cRaw }] = await Promise.all([
    sb.from('developers').select('id, name').order('name'),
    isNew ? Promise.resolve({ data: null }) : sb.from('complexes').select('*, unit_types(*), progress_updates(*), nearby(*), complex_photos(*)').eq('id', id).maybeSingle(),
  ]);
  const c = cRaw as FullComplex | null;

  return (
    <AdminShell email={user.email ?? ''}>
      <Link href="/admin/majmualar" style={{ textDecoration: 'none', fontSize: 14 }}>{t('← Majmualar')}</Link>
      <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{isNew ? t('Yangi majmua') : c?.name}</h1>
      {sp.saqlandi && <div className="success">{t('Saqlandi. Saytda 1 daqiqa ichida yangilanadi.')}</div>}
      {sp.xato && <div className="error" role="alert">{t('Saqlanmadi:')} {sp.xato}</div>}
      {(devs || []).length === 0 && <div className="error">{t("Avval quruvchi qo'shing:")} <Link href="/admin/quruvchilar/yangi">{t('yangi quruvchi')}</Link>.</div>}
      <ComplexEditor
        mode="admin"
        lang={lang}
        c={c}
        devs={devs || []}
        actions={{ saveComplex, deleteComplex, addUnit, deleteUnit, addProgress, deleteProgress, addNearby, deleteNearby, addPhoto, deletePhoto }}
      />
    </AdminShell>
  );
}
