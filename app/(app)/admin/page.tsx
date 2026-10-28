import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { locale, T } from '@/lib/i18n';
import { setLeadStatus, deleteSampleData } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

const STATUS: Record<string, string> = { yangi: 'Yangi', boglanildi: "Bog'lanildi", yopildi: 'Yopildi' };

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = T(lang);
  const { sb, user } = await requireAdmin();
  const [{ data: leads }, { count: sampleCount }] = await Promise.all([
    sb.from('leads').select('*, complex:complexes(name, slug)').order('created_at', { ascending: false }).limit(200),
    sb.from('complexes').select('id', { count: 'exact', head: true }).eq('is_sample', true),
  ]);
  const fresh = (leads || []).filter((l) => l.status === 'yangi').length;

  return (
    <AdminShell email={user.email ?? ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t('Arizalar')}</h1>
        <span className="muted">{t('{a} ta yangi · jami {b}', { a: fresh, b: (leads || []).length })}</span>
      </div>
      {sp.namuna === 'ochirildi' && <div className="success">{t("Namuna ma'lumotlar o'chirildi.")}</div>}

      <div className="card table-wrap">
        <table className="t" style={{ minWidth: 760 }}>
          <thead><tr><th>{t('Sana')}</th><th>{t('Ism')}</th><th>{t('Telefon')}</th><th>{t('Majmua')}</th><th>{t('Turi')}</th><th>{t('Holati')}</th></tr></thead>
          <tbody>
            {(leads || []).length === 0 && <tr><td colSpan={6} className="muted">{t("Hozircha ariza yo'q. Sayt orqali birinchi ariza kelganda shu yerda paydo bo'ladi.")}</td></tr>}
            {(leads || []).map((l) => (
              <tr key={l.id}>
                <td className="muted">{new Date(l.created_at).toLocaleString(locale(lang), { timeZone: 'Asia/Samarkand', dateStyle: 'short', timeStyle: 'short' })}</td>
                <td style={{ fontWeight: 600 }}>{l.name}</td>
                <td style={{ userSelect: 'all' }}>{l.phone}</td>
                <td>{l.complex?.name ?? '—'}</td>
                <td>{l.kind === 'qongiroq' ? t("Qo'ng'iroq") : t("Ko'rish")}</td>
                <td>
                  <form action={setLeadStatus} style={{ display: 'flex', gap: 6 }}>
                    <input type="hidden" name="id" value={l.id} />
                    <select name="status" defaultValue={l.status} className="input" style={{ height: 36, width: 'auto' }} aria-label={t('Holati')}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                    </select>
                    <button className="btn small ghost" type="submit">{t('Saqlash')}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(sampleCount ?? 0) > 0 && (
        <div className="card section" style={{ alignItems: 'flex-start' }}>
          <h2 className="h2">{t("Namuna ma'lumotlar")}</h2>
          <span className="muted">{t("Saytda {n} ta namuna majmua bor. Haqiqiy majmualarni kiritib bo'lgach, namunalarni bir tugma bilan o'chiring.", { n: sampleCount ?? 0 })}</span>
          <form action={deleteSampleData}><button className="btn ghost small" type="submit">{t("Namunalarni o'chirish")}</button></form>
        </div>
      )}
    </AdminShell>
  );
}
