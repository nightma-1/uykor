import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { dueLabel, mln } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminComplexes() {
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const { data } = await sb.from('complexes').select('id, slug, name, district, status, promised_date, price_m2, progress, published, is_sample, developer:developers(name)').order('created_at', { ascending: false });
  return (
    <AdminShell email={user.email ?? ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t("Majmualar")}</h1>
        <Link href="/admin/majmualar/yangi" className="btn">{t("+ Yangi majmua")}</Link>
      </div>
      <div className="card table-wrap">
        <table className="t" style={{ minWidth: 760 }}>
          <thead><tr><th>{t("Nomi")}</th><th>{t("Quruvchi")}</th><th>{t("Tuman")}</th><th>{t("m² narxi")}</th><th>{t("Topshirish")}</th><th>{t("Qurilish")}</th><th>{t("Saytda")}</th></tr></thead>
          <tbody>
            {(data || []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/majmualar/${c.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>{c.name}</Link>{c.is_sample && <span className="chip warn" style={{ marginLeft: 6 }}>{t("namuna")}</span>}</td>
                <td>{(c.developer as unknown as { name: string } | null)?.name}</td>
                <td>{c.district}</td>
                <td>{mln(c.price_m2, 1)} {t("mln")}</td>
                <td>{dueLabel(c, lang)}</td>
                <td>{c.progress}%</td>
                <td>{c.published ? <span className="chip ok">{t("Ha")}</span> : <span className="chip gray">{t("Yashirin")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
