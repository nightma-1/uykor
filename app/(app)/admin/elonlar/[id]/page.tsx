import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { requireAdmin } from '@/lib/supabase-server';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';
import { KINDS, priceText, roomsText, STATUS_LABEL, type Listing } from '@/lib/listings';
import { hoursText, LISTING_COLS } from '@/lib/contact';
import { approveListing, rejectListing, resolveReport, blockOwner } from '../../elon-actions';

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = { kadastr: 'Kadastr hujjati', pasport: 'Pasport', boshqa: 'Boshqa' };
const REASON: Record<string, string> = { makler: 'Makler', band: 'Band/sotilgan', yolgon: "Yolg'on ma'lumot", boshqa: 'Boshqa' };

export default async function ReviewListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const lang = await getLang();
  const t = T(lang);
  const [{ data: lr }, { data: lphone }] = await Promise.all([
    sb.from('listings').select(LISTING_COLS).eq('id', id).maybeSingle(),
    sb.rpc('my_contact', { kind: 'elon', rid: id }),
  ]);
  if (!lr) {
    return <AdminShell email={user.email ?? ''}><span>E&apos;lon topilmadi.</span><Link href="/admin/elonlar">← Orqaga</Link></AdminShell>;
  }
  const l = { ...(lr as unknown as Listing), phone: (lphone as string | null) ?? '' };
  const [{ data: photos }, { data: docs }, { data: reports }, { data: prof }, { count: ownerCount }] = await Promise.all([
    sb.from('listing_photos').select('id, url').eq('listing_id', id).order('sort'),
    sb.from('listing_docs').select('id, kind, path').eq('listing_id', id),
    sb.from('listing_reports').select('*').eq('listing_id', id).order('created_at', { ascending: false }),
    sb.from('profiles').select('*').eq('id', l.owner_id).maybeSingle(),
    sb.from('listings').select('id', { count: 'exact', head: true }).eq('owner_id', l.owner_id),
  ]);
  // Short-lived links so documents are never exposed publicly.
  const signed = await Promise.all((docs || []).map(async (d) => {
    const { data } = await sb.storage.from('hujjatlar').createSignedUrl(d.path, 600);
    return { ...d, url: data?.signedUrl ?? null };
  }));

  return (
    <AdminShell email={user.email ?? ''}>
      <Link href="/admin/elonlar" style={{ textDecoration: 'none', fontSize: 14 }}>{t("← E'lonlar")}</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h1 className="display" style={{ margin: 0, fontSize: 26 }}>{l.title}</h1>
        <span className="chip gray">{t(STATUS_LABEL[l.status])}</span>
      </div>
      {sp.xato && <div className="error">{sp.xato}</div>}

      <section className="card section">
        <div className="muted">{t(KINDS[l.kind].title)} · {[l.district, l.address].filter(Boolean).join(', ')} · {roomsText(l, lang)}</div>
        <strong className="num" style={{ fontSize: 20 }}>{priceText(l, lang)}</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(photos || []).map((p) => <img key={p.id} src={p.url} alt="" style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 10 }} />)}
        </div>
        {l.description && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{l.description}</p>}
        <span>{t("Aloqa:")} <strong>{l.contact_name}</strong> · <span style={{ userSelect: 'all' }}>{l.phone}</span> · {t("Qo'ng'iroq vaqti")}: {hoursText(l, lang)}</span>
        {l.lat != null && <span className="muted">{t("Joy:")} {l.lat}, {l.lng}</span>}
      </section>

      <section className="card section">
        <h2 className="h2">{t("E'lon beruvchi")}</h2>
        <span>{prof?.full_name || '—'} · {prof?.phone || '—'} · {prof?.account_type === 'quruvchi' ? `${t('Quruvchi')}: ${prof?.company || '—'}` : t('Uy egasi')}</span>
        <span className={(ownerCount ?? 0) > 3 ? 'error' : 'muted'}>{t("Jami e'lonlari:")} {ownerCount ?? 0}{(ownerCount ?? 0) > 3 ? ` — ${t("ko'p e'lon makler belgisi bo'lishi mumkin")}` : ''}</span>
        {prof?.blocked ? <span className="chip warn" style={{ alignSelf: 'flex-start' }}>{t("Bloklangan")}</span> : (
          <form action={blockOwner}>
            <input type="hidden" name="owner_id" value={l.owner_id} />
            <label className="check"><input type="checkbox" required /> {t("Bu makler, hisobni bloklash")}</label>
            <button className="btn ghost small" type="submit" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>{t("Bloklash")}</button>
          </form>
        )}
      </section>

      <section className="card section">
        <h2 className="h2">{t("Hujjatlar")}</h2>
        {signed.length === 0 && <span className="muted">{l.verification === 'tasdiqlangan' ? t("Egalik avval tasdiqlangan, hujjatlar o'chirilgan.") : t('Hujjat yuklanmagan.')}</span>}
        <span className="muted" style={{ fontSize: 13 }}>{t("Tekshiring: kadastrdagi egasining ismi pasportdagi ism bilan bir xilmi. Havolalar 10 daqiqa ishlaydi. Qaror qabul qilinishi bilan hujjatlar o'chiriladi.")}</span>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {signed.map((d) => (
            <a key={d.id} href={d.url ?? '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none' }}>
              {d.url && <img src={d.url} alt={t(DOC_LABEL[d.kind] ?? d.kind)} style={{ width: 260, height: 180, objectFit: 'contain', background: '#EEF0F4', borderRadius: 10 }} />}
              <span>{t(DOC_LABEL[d.kind] ?? d.kind)} ↗</span>
            </a>
          ))}
        </div>
      </section>

      {(reports || []).length > 0 && (
        <section className="card section">
          <h2 className="h2">{t("Shikoyatlar")}</h2>
          {(reports || []).map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="chip warn">{t(REASON[r.reason] ?? r.reason)}</span>
              <span>{r.comment || '—'}</span>
              {r.resolved ? <span className="chip ok">{t("Ko'rildi")}</span> : (
                <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="listing_id" value={id} /><button className="btn ghost small" type="submit">{t("Ko'rildi deb belgilash")}</button></form>
              )}
            </div>
          ))}
        </section>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <form action={approveListing} className="card section" style={{ flex: '1 1 280px' }}>
          <input type="hidden" name="id" value={id} />
          <h2 className="h2">{t("Tasdiqlash")}</h2>
          <span className="muted" style={{ fontSize: 14 }}>{t("E'lon saytga chiqadi va \"tekshirilgan\" belgisini oladi.")}</span>
          <button className="btn" type="submit">{t("Tasdiqlash")}</button>
        </form>
        <form action={rejectListing} className="card section" style={{ flex: '1 1 280px' }}>
          <input type="hidden" name="id" value={id} />
          <h2 className="h2">{t("Rad etish")}</h2>
          <label htmlFor="reason" className="muted" style={{ fontSize: 13 }}>{t("Sabab (egasiga ko'rinadi)")}</label>
          <input id="reason" name="reason" className="input" placeholder={t("masalan: kadastrdagi ism mos kelmadi")} />
          <button className="btn ghost" type="submit">{t("Rad etish")}</button>
        </form>
      </div>
    </AdminShell>
  );
}
