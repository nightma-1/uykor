import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { STATUS_LABEL } from '@/lib/listings';
import { catLabel, type MasterStats } from '@/lib/masters';
import { setReviewStatus } from '../usta-actions';
import { MASTER_COLS } from '@/lib/contact';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ustalar' };

export default async function AdminMasters({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const [{ data: queue }, { data: reviews }, { data: all }] = await Promise.all([
    sb.from('masters').select('id, name, categories, updated_at').eq('status', 'moderatsiya').order('updated_at'),
    sb.from('master_reviews').select('id, master_id, author_name, rating, body, created_at, master:masters(name)').eq('status', 'moderatsiya').order('created_at'),
    sb.from('master_stats').select(MASTER_COLS).neq('status', 'moderatsiya').order('updated_at', { ascending: false }).limit(200),
  ]);

  return (
    <AdminShell email={user.email ?? ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t("Ustalar")}</h1>
        <Link href="/admin/ustalar/yangi" className="btn">{t("+ Usta qo'shish")}</Link>
      </div>
      {sp.tasdiqlandi && <div className="success">{t("Usta tasdiqlandi va saytga chiqdi. Pasport o'chirildi.")}</div>}
      {sp.rad && <div className="success">{t("Profil rad etildi, sabab ustaga ko'rsatiladi. Pasport o'chirildi.")}</div>}
      {sp.bloklandi && <div className="success">{t("Hisob bloklandi.")}</div>}

      <section className="card section">
        <h2 className="h2">{t("Tekshiruvni kutmoqda (")}{(queue || []).length})</h2>
        {(queue || []).length === 0 && <span className="muted">{t("Navbat bo'sh.")}</span>}
        {(queue || []).map((m) => (
          <Link key={m.id} href={`/admin/ustalar/${m.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <strong>{m.name}</strong>
            <span className="muted">{(m.categories as string[]).map((c) => catLabel(c, lang)).join(', ')}</span>
          </Link>
        ))}
      </section>

      <section className="card section">
        <h2 className="h2">{t("Yangi sharhlar (")}{(reviews || []).length})</h2>
        {(reviews || []).length === 0 && <span className="muted">{t("Tekshiriladigan sharh yo'q.")}</span>}
        {(reviews || []).map((r) => (
          <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <span><strong>{r.author_name}</strong> → <Link href={`/admin/ustalar/${r.master_id}`}>{(r.master as unknown as { name: string } | null)?.name}</Link> · <span style={{ color: '#E3A008' }}>{'★'.repeat(r.rating)}</span></span>
            <span style={{ whiteSpace: 'pre-line' }}>{r.body}</span>
            <form action={setReviewStatus} style={{ display: 'flex', gap: 8 }}>
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="master_id" value={r.master_id} /><input type="hidden" name="back" value="list" />
              <button className="btn small" type="submit" name="status" value="faol">{t("Chiqarish")}</button>
              <button className="btn small ghost" type="submit" name="status" value="rad">{t("Rad etish")}</button>
            </form>
          </div>
        ))}
      </section>

      <section className="card section">
        <h2 className="h2">{t("Barcha ustalar")}</h2>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Ism")}</th><th>{t("Yo'nalish")}</th><th>{t("Reyting")}</th><th>{t("Holat")}</th><th>{t("Ko'rish")}</th></tr></thead>
            <tbody>
              {((all || []) as MasterStats[]).map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/admin/ustalar/${m.id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{m.name}</Link>{!m.owner_id && <span className="chip gray" style={{ marginLeft: 6 }}>{t("admin qo'shgan")}</span>}</td>
                  <td>{m.categories.slice(0, 2).map((c) => catLabel(c, lang)).join(', ')}</td>
                  <td>{m.review_count ? `${Number(m.rating).toFixed(1)} (${m.review_count})` : '—'}</td>
                  <td>{t(STATUS_LABEL[m.status])}</td>
                  <td>{m.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
