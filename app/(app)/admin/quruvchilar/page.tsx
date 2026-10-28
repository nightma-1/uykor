import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { locale, T } from '@/lib/i18n';
import { approveClaim, rejectClaim } from '../claim-actions';

export const dynamic = 'force-dynamic';

export default async function AdminDevelopers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const [{ data }, { data: claims }, { data: members }] = await Promise.all([
    sb.from('developer_stats').select('id, name, rating, verified, building_now, is_sample').order('name'),
    sb.from('developer_claims').select('*').eq('status', 'kutilmoqda').order('created_at'),
    sb.from('developer_members').select('developer_id'),
  ]);
  const memberCount: Record<string, number> = {};
  (members || []).forEach((m) => { memberCount[m.developer_id] = (memberCount[m.developer_id] || 0) + 1; });
  // Short-lived links so company documents are never exposed publicly.
  const docs = await Promise.all((claims || []).map(async (c) => {
    if (!c.doc_path) return null;
    const { data: s } = await sb.storage.from('hujjatlar').createSignedUrl(c.doc_path, 600);
    return s?.signedUrl ?? null;
  }));
  const realDevs = (data || []).filter((d) => !d.is_sample);

  return (
    <AdminShell email={user.email ?? ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28 }}>{t('Quruvchilar')}</h1>
        <Link href="/admin/quruvchilar/yangi" className="btn">{t('+ Yangi quruvchi')}</Link>
      </div>
      {sp.ulandi && <div className="success">{t("Foydalanuvchi quruvchi kabinetiga ulandi. Ariza hujjati o'chirildi.")}</div>}
      {sp.rad && <div className="success">{t("Ariza rad etildi. Hujjat o'chirildi.")}</div>}
      {sp.xato && <div className="error" role="alert">{sp.xato}</div>}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="h2">{t('Kabinetga ulanish arizalari')} ({(claims || []).length})</h2>
        {(claims || []).length === 0 && <div className="card section"><span className="muted">{t("Yangi ariza yo'q.")}</span></div>}
        {(claims || []).map((c, i) => (
          <div key={c.id} className="card section">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 17 }}>{c.company_name}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{new Date(c.created_at).toLocaleString(locale(lang), { timeZone: 'Asia/Samarkand', dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <span>{c.contact_name}{c.position ? ` · ${c.position}` : ''} · <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} style={{ userSelect: 'all' }}>{c.phone}</a></span>
            {c.note && <p style={{ margin: 0, whiteSpace: 'pre-line' }} className="muted">{c.note}</p>}
            {docs[i] ? <a href={docs[i]!} target="_blank" rel="noopener" className="btn ghost small" style={{ alignSelf: 'flex-start' }}>{t("Hujjatni ko'rish (10 daqiqa)")}</a> : <span className="muted" style={{ fontSize: 13 }}>{t('Hujjat yuklanmagan.')}</span>}
            <div className="notice"><span>{t("Tekshiring: kompaniyaning rasmiy telefoniga qo'ng'iroq qilib, bu odam haqiqatan ham shu kompaniyada ishlashini so'rang. Tasdiqlagach u majmualarni qo'sha oladi; yangi majmualar siz \"Saytda ko'rinsin\" belgisini qo'ymaguningizcha yashirin turadi.")}</span></div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <form action={approveClaim} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', flex: '1 1 380px' }}>
                <input type="hidden" name="id" value={c.id} />
                <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor={`dev-${c.id}`}>{t('Qaysi quruvchiga ulash')}</label>
                  <select id={`dev-${c.id}`} name="developer_id" className="input" defaultValue={c.developer_id || 'yangi'}>
                    <option value="yangi">{t('+ Yangi quruvchi yaratish')}: {c.company_name}</option>
                    {realDevs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <input type="hidden" name="new_name" value={c.company_name} />
                <button className="btn small" type="submit">{t('Tasdiqlash')}</button>
              </form>
              <form action={rejectClaim} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', flex: '1 1 300px' }}>
                <input type="hidden" name="id" value={c.id} />
                <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor={`rr-${c.id}`}>{t('Sabab (arizachiga ko\'rinadi)')}</label><input id={`rr-${c.id}`} name="reason" className="input" maxLength={300} placeholder={t("masalan: kompaniya tasdiqlamadi")} /></div>
                <button className="btn ghost small" type="submit">{t('Rad etish')}</button>
              </form>
            </div>
          </div>
        ))}
      </section>

      <div className="card table-wrap">
        <table className="t">
          <thead><tr><th>{t('Nomi')}</th><th>{t('Reyting')}</th><th>{t('Tekshirilgan')}</th><th>{t('Qurilmoqda')}</th><th>{t('Kabinet')}</th></tr></thead>
          <tbody>
            {(data || []).map((d) => (
              <tr key={d.id}>
                <td><Link href={`/admin/quruvchilar/${d.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>{d.name}</Link>{d.is_sample && <span className="chip warn" style={{ marginLeft: 6 }}>{t('namuna')}</span>}</td>
                <td>{Number(d.rating).toFixed(1)}</td>
                <td>{d.verified ? t('Ha') : t("Yo'q")}</td>
                <td>{d.building_now}</td>
                <td>{memberCount[d.id] ? t('{n} ta xodim', { n: memberCount[d.id] }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
