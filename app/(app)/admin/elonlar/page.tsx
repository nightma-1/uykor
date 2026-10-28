import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { KINDS, priceText, STATUS_LABEL, type Listing } from '@/lib/listings';

export const dynamic = 'force-dynamic';
export const metadata = { title: "E'lonlar" };

const REASON: Record<string, string> = { makler: 'Makler', band: 'Band/sotilgan', yolgon: "Yolg'on ma'lumot", boshqa: 'Boshqa' };

export default async function AdminListings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const [{ data: queue }, { data: reports }, { data: active }] = await Promise.all([
    sb.from('listings').select('id, kind, title, price, currency, district, updated_at').eq('status', 'moderatsiya').order('updated_at'),
    sb.from('listing_reports').select('id, reason, comment, created_at, listing:listings(id, title)').eq('resolved', false).order('created_at', { ascending: false }),
    sb.from('listings').select('id, kind, title, price, currency, status, views').in('status', ['faol', 'arxiv', 'rad']).order('updated_at', { ascending: false }).limit(100),
  ]);

  return (
    <AdminShell email={user.email ?? ''}>
      <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t("E'lonlar")}</h1>
      {sp.tasdiqlandi && <div className="success">{t("E'lon tasdiqlandi va saytga chiqdi. Hujjatlar o'chirildi.")}</div>}
      {sp.rad && <div className="success">{t("E'lon rad etildi, sabab egasiga ko'rsatiladi. Hujjatlar o'chirildi.")}</div>}
      {sp.bloklandi && <div className="success">{t("Foydalanuvchi bloklandi, uning faol e'lonlari olib tashlandi.")}</div>}

      <section className="card section">
        <h2 className="h2">{t("Tekshiruvni kutmoqda (")}{(queue || []).length})</h2>
        {(queue || []).length === 0 && <span className="muted">{t("Navbat bo'sh.")}</span>}
        {(queue || []).map((l) => (
          <Link key={l.id} href={`/admin/elonlar/${l.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <span><strong>{l.title}</strong> <span className="muted">· {t(KINDS[l.kind as keyof typeof KINDS].title)} · {l.district}</span></span>
            <span className="num">{priceText(l as Listing, lang)}</span>
          </Link>
        ))}
      </section>

      <section className="card section">
        <h2 className="h2">{t("Ochiq shikoyatlar (")}{(reports || []).length})</h2>
        {(reports || []).length === 0 && <span className="muted">{t("Shikoyat yo'q.")}</span>}
        {(reports || []).map((r) => {
          const lst = r.listing as unknown as { id: string; title: string } | null;
          return (
            <Link key={r.id} href={lst ? `/admin/elonlar/${lst.id}` : '#'} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="chip warn">{t(REASON[r.reason] ?? r.reason)}</span>
              <strong>{lst?.title ?? t("O'chirilgan e'lon")}</strong>
              {r.comment && <span className="muted">{r.comment}</span>}
            </Link>
          );
        })}
      </section>

      <section className="card section">
        <h2 className="h2">{t("Boshqa e'lonlar")}</h2>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Sarlavha")}</th><th>{t("Turi")}</th><th>{t("Narx")}</th><th>{t("Holat")}</th><th>{t("Ko'rish")}</th></tr></thead>
            <tbody>
              {(active || []).map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/admin/elonlar/${l.id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{l.title}</Link></td>
                  <td>{t(KINDS[l.kind as keyof typeof KINDS].title)}</td>
                  <td>{priceText(l as Listing, lang)}</td>
                  <td>{t(STATUS_LABEL[l.status as Listing['status']])}</td>
                  <td>{l.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
