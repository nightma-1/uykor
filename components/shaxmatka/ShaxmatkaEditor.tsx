'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { mln, som } from '@/lib/format';
import { T, type Lang } from '@/lib/i18n';
import {
  autoLayout, autoRooms, bbox, centroid, COMPASS, COMPASS_UZ, polyArea, round1, round2, STATUS_COLOR, STATUS_INK, windowLabels,
  type Apartment, type AptStatus, type Block, type FloorPlan, type Pt, type Shaxmatka, type UnitDef,
} from '@/lib/shaxmatka';
import { deleteBlock, deletePlan, loadShaxmatka, saveBlock, savePlan, updateApartments } from '@/lib/shaxmatka-actions';
import FacadeView from './FacadeView';
import { statusText } from './FloorPlanSvg';
import '@/app/shaxmatka.css';

const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function upload(file: File, bucket: string, folder: string, maxSide = 2000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('rasm'))), 'image/webp', 0.85));
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: 'image/webp' });
  if (error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

type Props = {
  lang: Lang;
  mode: 'admin' | 'dev';
  complex: { id: string; slug: string; name: string; price_m2: number; floors: number | null; published: boolean };
  initial: Shaxmatka;
  userId: string;
};

const newBlock = (complexId: string, name: string, floors: number, sort: number): Block => ({
  id: '', complex_id: complexId, name, floors, commercial_floors: 0, floor_height: 3, width_m: 28, depth_m: 17, rotation_deg: 0,
  pos_x: sort * 34, pos_z: 0, facade_url: null, facade_top: 8, facade_bottom: 92, color: '#E9E4DA', model_url: null, sort,
});

export default function ShaxmatkaEditor({ lang, mode, complex, initial, userId }: Props) {
  const t = T(lang);
  const [data, setData] = useState<Shaxmatka>(initial);
  const [blockId, setBlockId] = useState(initial.blocks[0]?.id ?? '');
  const [draftBlock, setDraftBlock] = useState<Block | null>(initial.blocks.length ? null : newBlock(complex.id, 'A', complex.floors || 9, 0));
  const [planDraft, setPlanDraft] = useState<FloorPlan | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const bucket = mode === 'admin' ? 'rasmlar' : 'elonlar';
  const folder = mode === 'admin' ? 'shaxmatka' : `${userId}/shaxmatka`;

  const block = draftBlock ?? data.blocks.find((b) => b.id === blockId) ?? null;
  const plans = data.plans.filter((p) => p.block_id === block?.id).sort((a, b) => a.floor_from - b.floor_from);
  const apts = data.apartments.filter((a) => a.block_id === block?.id);

  async function reload(selectBlock?: string) {
    const d = await loadShaxmatka(complex.id);
    if (d) {
      setData(d);
      if (selectBlock) setBlockId(selectBlock);
    }
  }
  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    if (ok) setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), 3500);
  }

  async function onSaveBlock(b: Block) {
    setBusy(true);
    const r = await saveBlock({ ...b, id: b.id || undefined, complex_id: complex.id });
    setBusy(false);
    if (!r.ok) return flash(false, r.error);
    setDraftBlock(null);
    await reload(r.id);
    flash(true, t('Blok saqlandi'));
  }
  async function onDeleteBlock(id: string) {
    if (!window.confirm(t("Blok, uning planirovkalari va xonadonlari o'chadi. Davom etamizmi?"))) return;
    setBusy(true);
    const r = await deleteBlock(id);
    setBusy(false);
    if (!r.ok) return flash(false, r.error);
    await reload();
    setBlockId(data.blocks.find((b) => b.id !== id)?.id ?? '');
    flash(true, t("Blok o'chirildi"));
  }
  async function onSavePlan(p: FloorPlan) {
    setBusy(true);
    const r = await savePlan({ id: p.id || undefined, block_id: p.block_id, name: p.name, floor_from: p.floor_from, floor_to: p.floor_to, image_url: p.image_url, ceiling_m: p.ceiling_m, units: p.units });
    setBusy(false);
    if (!r.ok) return flash(false, r.error);
    setPlanDraft(null);
    await reload();
    flash(true, t('Planirovka saqlandi, xonadonlar yangilandi'));
  }
  async function onDeletePlan(id: string) {
    if (!window.confirm(t("Planirovka va shu qavatlardagi xonadonlar o'chadi. Davom etamizmi?"))) return;
    setBusy(true);
    const r = await deletePlan(id);
    setBusy(false);
    if (!r.ok) return flash(false, r.error);
    await reload();
  }

  return (
    <div className="shx-ed">
      <div className="notice">
        <span>
          {t("Bu yerda bino bloklari, qavat planirovkalari va har bir xonadon holatini kiritasiz. Saytda fasad, 3D bino va xonadon tanlash avtomatik paydo bo'ladi.")}
          {complex.published && <> <a href={`/jk/${complex.slug}#xonadonlar`} target="_blank" rel="noopener">{t("Saytda ko'rish ↗")}</a></>}
        </span>
      </div>
      {msg && <div className={msg.ok ? 'success' : 'error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {data.blocks.map((b) => (
          <button key={b.id} type="button" className="shx-tag" aria-pressed={!draftBlock && b.id === block?.id} onClick={() => { setDraftBlock(null); setBlockId(b.id); setPlanDraft(null); }}>
            {t('{name} blok', { name: b.name })} · {b.floors}
          </button>
        ))}
        <button type="button" className="shx-tag" aria-pressed={!!draftBlock} onClick={() => { setDraftBlock(newBlock(complex.id, String.fromCharCode(65 + data.blocks.length), complex.floors || 9, data.blocks.length)); setPlanDraft(null); }}>
          {t("+ Blok qo'shish")}
        </button>
      </div>

      {block && (
        <BlockForm
          key={block.id || 'new'}
          t={t}
          block={block}
          busy={busy}
          bucket={bucket}
          folder={folder}
          apartments={apts}
          onSave={onSaveBlock}
          onDelete={block.id ? () => onDeleteBlock(block.id) : undefined}
          onCancel={draftBlock && data.blocks.length ? () => setDraftBlock(null) : undefined}
        />
      )}

      {block && block.id && !draftBlock && (
        <section className="card section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="h2">{t('Qavat planirovkalari')}</h2>
            <span className="muted" style={{ fontSize: 13 }}>{t("Bir xil qavatlar (masalan 3–12) uchun bitta planirovka yetadi.")}</span>
          </div>
          {plans.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <strong>{p.name || t('Planirovka')}</strong>
              <span className="muted">{t('{a}–{b}-qavatlar', { a: p.floor_from, b: p.floor_to })} · {t('qavatda {n} ta xonadon', { n: p.units.length })}</span>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn ghost small" onClick={() => setPlanDraft(structuredClone(p))}>{t('Tahrirlash')}</button>
              <button type="button" className="btn ghost small" style={{ color: 'var(--danger)' }} onClick={() => onDeletePlan(p.id)}>{t("O'chirish")}</button>
            </div>
          ))}
          {!planDraft && (
            <div>
              <button type="button" className="btn ghost" onClick={() => {
                const used = new Set(plans.flatMap((p) => Array.from({ length: p.floor_to - p.floor_from + 1 }, (_, i) => p.floor_from + i)));
                let from = block.commercial_floors + 1;
                while (used.has(from) && from <= block.floors) from++;
                let to = from;
                while (to + 1 <= block.floors && !used.has(to + 1)) to++;
                setPlanDraft({ id: '', complex_id: complex.id, block_id: block.id, name: from === to ? `${from}-qavat` : `Tipik qavat ${from}–${to}`, floor_from: from, floor_to: Math.min(to, block.floors), image_url: null, ceiling_m: 2.8, units: [] });
              }}>{t("+ Planirovka qo'shish")}</button>
            </div>
          )}
          {planDraft && (
            <PlanEditor key={planDraft.id || 'new'} t={t} block={block} plan={planDraft} busy={busy} bucket={bucket} folder={folder} onChange={setPlanDraft} onSave={onSavePlan} onCancel={() => setPlanDraft(null)} />
          )}
        </section>
      )}

      {block && block.id && !draftBlock && apts.length > 0 && (
        <ChessGrid t={t} block={block} apartments={apts} priceM2={complex.price_m2} onChanged={reload} flash={flash} />
      )}
    </div>
  );
}

// ---------- Blok formasi ----------

function BlockForm({ t, block, busy, bucket, folder, apartments, onSave, onDelete, onCancel }: {
  t: ReturnType<typeof T>; block: Block; busy: boolean; bucket: string; folder: string; apartments: Apartment[];
  onSave: (b: Block) => void; onDelete?: () => void; onCancel?: () => void;
}) {
  const [b, setB] = useState<Block>(block);
  const [up, setUp] = useState<'idle' | 'busy' | 'error'>('idle');
  const set = (k: keyof Block, v: string | number | null) => setB((x) => ({ ...x, [k]: v }));
  const numF = (k: keyof Block, label: string, hint?: string, step = 1) => (
    <div className="field">
      <label htmlFor={`b-${k}`}>{label}</label>
      <input id={`b-${k}`} className="input" type="number" step={step} value={String(b[k] ?? '')} onChange={(e) => set(k, e.target.value === '' ? 0 : Number(e.target.value))} />
      {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
    </div>
  );
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUp('busy');
    try { set('facade_url', await upload(f, bucket, folder, 1800)); setUp('idle'); } catch { setUp('error'); }
  }
  return (
    <section className="card section" style={{ gap: 16 }}>
      <h2 className="h2">{block.id ? t('{name} blok', { name: block.name }) : t('Yangi blok')}</h2>
      <div className="form-grid">
        <div className="field"><label htmlFor="b-name">{t('Blok nomi')}</label><input id="b-name" className="input" value={b.name} maxLength={20} onChange={(e) => set('name', e.target.value)} /><span className="muted" style={{ fontSize: 12 }}>{t('masalan A, B yoki 1-blok')}</span></div>
        {numF('floors', t('Qavatlar soni'))}
        {numF('commercial_floors', t("Do'kon qavatlari (pastdan)"), t('sotuvda emas, 0 = yo\'q'))}
        {numF('floor_height', t('Qavat balandligi, m'), undefined, 0.1)}
        {numF('width_m', t('Bino uzunligi, m'), t('fasad bo\'ylab'), 0.1)}
        {numF('depth_m', t('Bino eni, m'), undefined, 0.1)}
        {numF('rotation_deg', t('Burilish, gradus'), t("0 = planirovka tepasi shimolga qaragan"), 5)}
        {numF('pos_x', t('Hovlidagi joyi X, m'), t("bloklar bir-biriga tegmasin"))}
        {numF('pos_z', t('Hovlidagi joyi Y, m'))}
        <div className="field"><label htmlFor="b-color">{t('Fasad rangi')}</label><input id="b-color" className="input" type="color" value={b.color} onChange={(e) => set('color', e.target.value)} style={{ padding: 4 }} /></div>
      </div>

      <div className="shx-ed-grid">
        <div className="field">
          <span className="label">{t('Fasad rasmi (ixtiyoriy)')}</span>
          <span className="muted" style={{ fontSize: 13 }}>{t("Binoning old tomondan rasmi yoki render. Qizil chiziqlarni tom va yer darajasiga qo'ying: qavatlar avtomatik bo'linadi.")}</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label className="btn ghost small" style={{ cursor: 'pointer' }}>
              {up === 'busy' ? t('Yuklanmoqda…') : b.facade_url ? t('Boshqa rasm') : t('Rasm tanlash')}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
            {b.facade_url && <button type="button" className="btn ghost small" onClick={() => set('facade_url', null)}>{t('Olib tashlash')}</button>}
          </div>
          {up === 'error' && <span className="error">{t('Rasm yuklanmadi')}</span>}
          {b.facade_url && (
            <>
              <div className="shx-calib">
                <img src={b.facade_url} alt="" />
                <div className="ln" style={{ top: `${b.facade_top}%` }} />
                <div className="ln" style={{ top: `${b.facade_bottom}%` }} />
                {Array.from({ length: b.floors - 1 }, (_, i) => (
                  <div key={i} className="band" style={{ top: `${b.facade_top + ((b.facade_bottom - b.facade_top) / b.floors) * (i + 1)}%` }} />
                ))}
              </div>
              <label className="field"><span className="label">{t('Tom chizig\'i')}: {Math.round(b.facade_top)}%</span><input type="range" min={0} max={60} step={0.5} value={b.facade_top} onChange={(e) => set('facade_top', Number(e.target.value))} /></label>
              <label className="field"><span className="label">{t('Yer chizig\'i')}: {Math.round(b.facade_bottom)}%</span><input type="range" min={40} max={100} step={0.5} value={b.facade_bottom} onChange={(e) => set('facade_bottom', Number(e.target.value))} /></label>
            </>
          )}
        </div>
        <div className="field">
          <span className="label">{t("Saytda ko'rinishi")}</span>
          <div className="shx-stage" style={{ height: 360, minHeight: 0 }}>
            <FacadeView t={t} block={b} apartments={apartments} selFloor={null} isDimmed={() => false} onPick={() => undefined} />
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="b-model">{t('Tayyor 3D model (GLB havola, premium)')}</label>
        <input id="b-model" className="input" placeholder="https://…/bino.glb" value={b.model_url ?? ''} onChange={(e) => set('model_url', e.target.value || null)} />
        <span className="muted" style={{ fontSize: 12 }}>{t("Arxitektor 3D fayli bo'lsa, GLB formatga o'tkazib havolasini qo'ying. Bo'lmasa bino o'lchamlardan avtomatik quriladi.")}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn" disabled={busy} onClick={() => onSave(b)}>{busy ? t('Saqlanmoqda…') : t('Saqlash')}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>{t('Bekor qilish')}</button>}
        {onDelete && <button type="button" className="btn ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onDelete}>{t("Blokni o'chirish")}</button>}
      </div>
    </section>
  );
}

// ---------- Planirovka muharriri ----------

type Tool = 'select' | 'unit' | 'room';
const ROOM_CHOICES = ['Mehmonxona', 'Yotoqxona', 'Oshxona', 'Hammom', 'Hojatxona', 'Dahliz', 'Kiyimxona', 'Balkon'];

function PlanEditor({ t, block, plan, busy, bucket, folder, onChange, onSave, onCancel }: {
  t: ReturnType<typeof T>; block: Block; plan: FloorPlan; busy: boolean; bucket: string; folder: string;
  onChange: (p: FloorPlan) => void; onSave: (p: FloorPlan) => void; onCancel: () => void;
}) {
  const W = block.width_m, D = block.depth_m;
  const [tool, setTool] = useState<Tool>(plan.units.length ? 'select' : 'unit');
  const [sel, setSel] = useState<string | null>(plan.units[0]?.key ?? null);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [hoverPt, setHoverPt] = useState<Pt | null>(null);
  const [mix, setMix] = useState('1,2,3,3,2,1');
  const [up, setUp] = useState<'idle' | 'busy' | 'error'>('idle');
  const svgRef = useRef<SVGSVGElement>(null);
  const unit = plan.units.find((u) => u.key === sel) ?? null;
  const pad = Math.max(W, D) * 0.05;
  const fs = Math.max(W, D) / 50;

  const setUnits = (units: UnitDef[]) => onChange({ ...plan, units });
  const patchUnit = (key: string, p: Partial<UnitDef>) => setUnits(plan.units.map((u) => (u.key === key ? { ...u, ...p } : u)));
  const nextKey = () => {
    const used = new Set(plan.units.map((u) => u.key));
    for (let i = 0; i < 60; i++) { const k = i < 26 ? String.fromCharCode(65 + i) : `U${i}`; if (!used.has(k)) return k; }
    return `U${Date.now() % 1000}`;
  };

  const verts = useMemo(() => {
    const v: Pt[] = [[0, 0], [W, 0], [W, D], [0, D]];
    for (const u of plan.units) { v.push(...u.poly); for (const r of u.rooms_detail || []) v.push(...r.poly); }
    return v;
  }, [plan.units, W, D]);

  function toPlan(e: React.PointerEvent | React.MouseEvent): Pt {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    let x = Math.max(0, Math.min(W, p.x)), y = Math.max(0, Math.min(D, p.y));
    const snapR = Math.max(W, D) / 70;
    let best: Pt | null = null, bd = snapR;
    for (const v of [...verts, ...draft]) { const d = Math.hypot(v[0] - x, v[1] - y); if (d < bd) { bd = d; best = v; } }
    if (best) return [best[0], best[1]];
    if (x < snapR) x = 0; if (W - x < snapR) x = W; if (y < snapR) y = 0; if (D - y < snapR) y = D;
    // Chizilayotgan chiziqni gorizontal/vertikalga tekislash.
    const last = draft[draft.length - 1];
    if (last) { if (Math.abs(x - last[0]) < snapR) x = last[0]; if (Math.abs(y - last[1]) < snapR) y = last[1]; }
    return [round2(Math.round(x * 10) / 10), round2(Math.round(y * 10) / 10)];
  }

  function close() {
    if (draft.length < 3) return;
    if (tool === 'unit') {
      const key = nextKey();
      const area = round1(polyArea(draft));
      setUnits([...plan.units, { key, rooms: 1, area, poly: draft, windows: [], rooms_detail: [] }]);
      setSel(key);
    } else if (tool === 'room' && unit) {
      const r = { name: 'Yotoqxona', area: round1(polyArea(draft)), poly: draft };
      patchUnit(unit.key, { rooms_detail: [...(unit.rooms_detail || []), r] });
    }
    setDraft([]);
  }

  function onClick(e: React.MouseEvent) {
    if (tool === 'select') return;
    if (tool === 'room' && !unit) return;
    const p = toPlan(e);
    if (draft.length >= 3 && Math.hypot(p[0] - draft[0][0], p[1] - draft[0][1]) < 0.01) { close(); return; }
    setDraft([...draft, p]);
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea,select')) return;
      if (e.key === 'Escape') setDraft([]);
      if (e.key === 'Backspace' && draft.length) { e.preventDefault(); setDraft(draft.slice(0, -1)); }
      if (e.key === 'Enter') close();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUp('busy');
    try { onChange({ ...plan, image_url: await upload(f, bucket, folder, 2200) }); setUp('idle'); } catch { setUp('error'); }
  }

  function autoSplit(u: UnitDef) {
    const bb = bbox(u.poly);
    const corridorTop = Math.abs(bb.y0) > 0.2 && Math.abs(bb.y1 - D) < 0.2 ? 'top' : Math.abs(bb.y0) < 0.2 ? 'bottom' : centroid(u.poly)[1] > D / 2 ? 'top' : 'bottom';
    patchUnit(u.key, { rooms_detail: autoRooms(bb.x0, bb.y0, bb.x1, bb.y1, u.rooms, corridorTop) });
  }

  const totalArea = plan.units.reduce((s, u) => s + u.area, 0);

  return (
    <div className="card section" style={{ gap: 14, background: 'var(--bg)' }}>
      <div className="form-grid">
        <div className="field"><label htmlFor="p-name">{t('Nomi')}</label><input id="p-name" className="input" value={plan.name} onChange={(e) => onChange({ ...plan, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="p-from">{t('Qaysi qavatdan')}</label><input id="p-from" className="input" type="number" min={block.commercial_floors + 1} max={block.floors} value={plan.floor_from} onChange={(e) => onChange({ ...plan, floor_from: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="p-to">{t('Qaysi qavatgacha')}</label><input id="p-to" className="input" type="number" min={plan.floor_from} max={block.floors} value={plan.floor_to} onChange={(e) => onChange({ ...plan, floor_to: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="p-ceil">{t('Shift balandligi, m')}</label><input id="p-ceil" className="input" type="number" step={0.05} value={plan.ceiling_m} onChange={(e) => onChange({ ...plan, ceiling_m: Number(e.target.value) })} /></div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 260px' }}>
          <span className="label">{t('Planirovka rasmi (ixtiyoriy)')}</span>
          <span className="muted" style={{ fontSize: 12 }}>{t("Rasmni bino konturi bo'yicha qirqib yuklang: u {w}×{d} m to'rtburchakka cho'ziladi. Keyin xonadonlarni rasm ustidan chizasiz.", { w: W, d: D })}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn ghost small" style={{ cursor: 'pointer' }}>
              {up === 'busy' ? t('Yuklanmoqda…') : plan.image_url ? t('Boshqa rasm') : t('Rasm tanlash')}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
            {plan.image_url && <button type="button" className="btn ghost small" onClick={() => onChange({ ...plan, image_url: null })}>{t('Olib tashlash')}</button>}
          </div>
          {up === 'error' && <span className="error">{t('Rasm yuklanmadi')}</span>}
        </div>
        <div className="field" style={{ flex: '1 1 260px' }}>
          <label htmlFor="p-mix">{t('Tez boshlash: xonadonlar xonalari ketma-ket')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="p-mix" className="input" value={mix} onChange={(e) => setMix(e.target.value)} placeholder="1,2,3,3,2,1" />
            <button type="button" className="btn ghost small" onClick={() => {
              const m = mix.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 6).slice(0, 24);
              if (!m.length) return;
              if (plan.units.length && !window.confirm(t("Chizilgan xonadonlar almashtiriladi. Davom etamizmi?"))) return;
              const units = autoLayout(W, D, m);
              setUnits(units);
              setSel(units[0]?.key ?? null);
              setTool('select');
            }}>{t('Avtomatik chizish')}</button>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{t("O'rtada yo'lak, ikki qator xonadon. Keyin har birini qo'lda tuzatish mumkin.")}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="shx-tag" aria-pressed={tool === 'select'} onClick={() => { setTool('select'); setDraft([]); }}>{t('Tanlash')}</button>
        <button type="button" className="shx-tag" aria-pressed={tool === 'unit'} onClick={() => { setTool('unit'); setDraft([]); }}>{t('+ Xonadon chizish')}</button>
        <button type="button" className="shx-tag" aria-pressed={tool === 'room'} disabled={!unit} onClick={() => { setTool('room'); setDraft([]); }}>{t('+ Xona chizish')}{unit ? ` (${unit.key})` : ''}</button>
        {draft.length > 0 && (
          <>
            <button type="button" className="btn small" disabled={draft.length < 3} onClick={close}>{t('Yopish ({n} nuqta)', { n: draft.length })}</button>
            <button type="button" className="btn ghost small" onClick={() => setDraft(draft.slice(0, -1))}>{t('Oxirgi nuqtani olib tashlash')}</button>
          </>
        )}
        <span className="muted" style={{ fontSize: 12 }}>
          {tool === 'select' ? t('Xonadonni tanlash uchun bosing.') : t("Burchaklarni ketma-ket bosing, birinchi nuqtani bosib yoping. Nuqtalar bir-biriga va bino chetiga yopishadi.")}
        </span>
      </div>

      <div className="shx-ed-grid">
        <div className="shx-ed-canvas">
          <svg
            ref={svgRef}
            viewBox={`${-pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`}
            onClick={onClick}
            onMouseMove={(e) => tool !== 'select' && setHoverPt(toPlan(e))}
            onMouseLeave={() => setHoverPt(null)}
            style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          >
            <defs>
              <pattern id="grid1" width={1} height={1} patternUnits="userSpaceOnUse"><path d="M1 0 L0 0 0 1" fill="none" stroke="#E6E9EE" strokeWidth={0.03} /></pattern>
            </defs>
            <rect x={0} y={0} width={W} height={D} fill="url(#grid1)" stroke="var(--ink)" strokeWidth={fs * 0.15} />
            {plan.image_url && <image href={plan.image_url} x={0} y={0} width={W} height={D} preserveAspectRatio="none" opacity={0.75} />}
            {plan.units.map((u) => {
              const [cx, cy] = centroid(u.poly);
              const on = u.key === sel;
              return (
                <g key={u.key} onClick={(e) => { if (tool === 'select') { e.stopPropagation(); setSel(u.key); } }} style={{ cursor: tool === 'select' ? 'pointer' : undefined }}>
                  <polygon points={u.poly.map((p) => p.join(',')).join(' ')} fill={on ? 'rgba(35,70,160,0.35)' : 'rgba(47,158,107,0.28)'} stroke={on ? 'var(--lapis)' : '#1D6B3A'} strokeWidth={fs * (on ? 0.2 : 0.1)} />
                  {(u.rooms_detail || []).map((r, i) => (
                    <g key={i}>
                      <polygon points={r.poly.map((p) => p.join(',')).join(' ')} fill="none" stroke="#14213D" strokeOpacity={0.55} strokeWidth={fs * 0.06} />
                      {on && <text x={centroid(r.poly)[0]} y={centroid(r.poly)[1]} fontSize={fs * 0.6} textAnchor="middle" fill="#14213D">{t(r.name)}</text>}
                    </g>
                  ))}
                  <text x={cx} y={cy} fontSize={fs * 1.2} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill="#14213D" opacity={on ? 0.35 : 0.9}>{u.key}</text>
                </g>
              );
            })}
            {draft.length > 0 && (
              <polyline points={[...draft, ...(hoverPt ? [hoverPt] : [])].map((p) => p.join(',')).join(' ')} fill="rgba(214,69,69,0.12)" stroke="#D64545" strokeWidth={fs * 0.12} />
            )}
            {draft.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={fs * (i === 0 ? 0.45 : 0.3)} fill={i === 0 ? '#D64545' : '#FFFFFF'} stroke="#D64545" strokeWidth={fs * 0.1} />)}
            {hoverPt && tool !== 'select' && <circle cx={hoverPt[0]} cy={hoverPt[1]} r={fs * 0.25} fill="#D64545" />}
            <text x={W / 2} y={-pad * 0.35} fontSize={fs * 0.8} textAnchor="middle" fill="var(--muted)">{W} m</text>
            <text x={-pad * 0.35} y={D / 2} fontSize={fs * 0.8} textAnchor="middle" fill="var(--muted)" transform={`rotate(-90 ${-pad * 0.35} ${D / 2})`}>{D} m</text>
          </svg>
        </div>

        <div className="card section" style={{ gap: 12 }}>
          <div className="muted" style={{ fontSize: 13 }}>{t('Qavatda {n} ta xonadon, jami {a} m²', { n: plan.units.length, a: round1(totalArea) })}</div>
          {unit ? (
            <>
              <h3 style={{ margin: 0 }}>{t('Xonadon {k}', { k: unit.key })}</h3>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field"><label htmlFor="u-rooms">{t('Xonalar')}</label><input id="u-rooms" className="input" type="number" min={1} max={9} value={unit.rooms} onChange={(e) => patchUnit(unit.key, { rooms: Number(e.target.value) })} /></div>
                <div className="field"><label htmlFor="u-area">{t('Maydon, m²')}</label><input id="u-area" className="input" type="number" step={0.1} value={unit.area} onChange={(e) => patchUnit(unit.key, { area: Number(e.target.value) })} /><span className="muted" style={{ fontSize: 12 }}>{t('chizmadan: {n} m²', { n: round1(polyArea(unit.poly)) })}</span></div>
              </div>
              <div className="field">
                <span className="label">{t('Oynalar')}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COMPASS.map((c) => {
                    const on = (unit.windows || []).includes(c);
                    return <button key={c} type="button" className="shx-tag" aria-pressed={on} onClick={() => patchUnit(unit.key, { windows: on ? (unit.windows || []).filter((w) => w !== c) : [...(unit.windows || []), c] })}>{t(COMPASS_UZ[c])}</button>;
                  })}
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{t("Belgilanmasa, bino chetiga tegib turgan devorlardan hisoblanadi: {w}", { w: windowLabels({ ...unit, windows: [] }, block).map((w) => t(COMPASS_UZ[w])).join(', ') || '—' })}</span>
              </div>
              <div className="field">
                <span className="label">{t('Xonalar')}</span>
                {(unit.rooms_detail || []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select className="input" style={{ flex: '1 1 auto' }} value={ROOM_CHOICES.includes(r.name) ? r.name : ''} aria-label={t('Xona turi')} onChange={(e) => patchUnit(unit.key, { rooms_detail: unit.rooms_detail!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}>
                      {!ROOM_CHOICES.includes(r.name) && <option value="">{r.name}</option>}
                      {ROOM_CHOICES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
                    </select>
                    <input className="input" style={{ width: 84 }} type="number" step={0.1} value={r.area} aria-label={t('Maydon, m²')} onChange={(e) => patchUnit(unit.key, { rooms_detail: unit.rooms_detail!.map((x, j) => (j === i ? { ...x, area: Number(e.target.value) } : x)) })} />
                    <button type="button" className="btn ghost small" aria-label={t("O'chirish")} onClick={() => patchUnit(unit.key, { rooms_detail: unit.rooms_detail!.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="btn ghost small" onClick={() => { setTool('room'); setDraft([]); }}>{t('+ Xona chizish')}</button>
                  <button type="button" className="btn ghost small" onClick={() => autoSplit(unit)}>{t("Avtomatik bo'lish")}</button>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{t("Xonalar 3D da devor, eshik, deraza va mebel bilan quriladi.")}</span>
              </div>
              <button type="button" className="btn ghost small" style={{ color: 'var(--danger)', alignSelf: 'flex-start' }} onClick={() => { setUnits(plan.units.filter((u) => u.key !== unit.key)); setSel(null); }}>{t("Xonadonni o'chirish")}</button>
            </>
          ) : (
            <span className="muted">{t("Xonadonni tanlang yoki yangisini chizing.")}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn" disabled={busy || !plan.units.length} onClick={() => onSave(plan)}>{busy ? t('Saqlanmoqda…') : t('Planirovkani saqlash')}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>{t('Bekor qilish')}</button>
        <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>{t("Saqlanganda {a}–{b}-qavatlarda xonadonlar yaratiladi. Mavjud xonadonlarning holati va narxi saqlanib qoladi.", { a: plan.floor_from, b: plan.floor_to })}</span>
      </div>
    </div>
  );
}

// ---------- Shaxmatka: holat va narx ----------

type Brush = AptStatus | 'narx';

function ChessGrid({ t, block, apartments, priceM2, onChanged, flash }: {
  t: ReturnType<typeof T>; block: Block; apartments: Apartment[]; priceM2: number;
  onChanged: () => Promise<void>; flash: (ok: boolean, text: string) => void;
}) {
  const [brush, setBrush] = useState<Brush>('sotilgan');
  const [local, setLocal] = useState(apartments);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(apartments), [apartments]);

  const floors = [...new Set(local.map((a) => a.floor))].sort((a, b) => b - a);
  const maxCols = Math.max(0, ...floors.map((f) => local.filter((a) => a.floor === f).length));
  const counts = { sotuvda: 0, bron: 0, sotilgan: 0, yopiq: 0 } as Record<AptStatus, number>;
  local.forEach((a) => counts[a.status]++);

  async function apply(ids: string[]) {
    if (brush === 'narx') {
      setPicked((s) => { const n = new Set(s); ids.forEach((id) => (n.has(id) && ids.length === 1 ? n.delete(id) : n.add(id))); return n; });
      return;
    }
    const st = brush;
    const prev = local;
    setLocal((l) => l.map((a) => (ids.includes(a.id) ? { ...a, status: st } : a)));
    setSaving(true);
    const r = await updateApartments(ids.map((id) => ({ id, status: st })));
    setSaving(false);
    if (!r.ok) { setLocal(prev); flash(false, r.error); }
  }

  async function applyPrice() {
    const ids = [...picked];
    if (!ids.length) return;
    const n = Number(price.replace(/\s/g, '').replace(',', '.'));
    if (price.trim() !== '' && !(n > 0)) return flash(false, t("Narxni raqam bilan yozing"));
    const v = price.trim() === '' ? null : Math.round(n < 100000 ? n * 1_000_000 : n);
    setSaving(true);
    const r = await updateApartments(ids.map((id) => ({ id, price: v })));
    setSaving(false);
    if (!r.ok) return flash(false, r.error);
    setPicked(new Set());
    setPrice('');
    await onChanged();
    flash(true, t('Narx saqlandi: {n} ta xonadon', { n: r.count }));
  }

  return (
    <section className="card section">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h2 className="h2">{t('Shaxmatka: holat va narx')}</h2>
        <span className="muted num" style={{ fontSize: 13 }}>
          {(['sotuvda', 'bron', 'sotilgan', 'yopiq'] as AptStatus[]).map((s) => `${t(statusText(s))}: ${counts[s]}`).join(' · ')}{saving ? ` · ${t('Saqlanmoqda…')}` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13 }}>{t('Bosilganda:')}</span>
        {(['sotuvda', 'bron', 'sotilgan', 'yopiq'] as AptStatus[]).map((s) => (
          <button key={s} type="button" className="shx-tag" aria-pressed={brush === s} onClick={() => { setBrush(s); setPicked(new Set()); }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[s], display: 'inline-block' }} aria-hidden="true" />{t(statusText(s))}
          </button>
        ))}
        <button type="button" className="shx-tag" aria-pressed={brush === 'narx'} onClick={() => setBrush('narx')}>{t('Narx belgilash')}</button>
      </div>
      <span className="muted" style={{ fontSize: 12 }}>
        {brush === 'narx' ? t("Xonadonlarni tanlang, keyin narxni yozing. Bo'sh qoldirilsa narx maydon × 1 m² narxidan hisoblanadi.") : t("Xonadonni bosing — holati darhol saqlanadi va saytda yangilanadi. Qavat raqamini bosing — butun qavat.")}
      </span>
      {brush === 'narx' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" style={{ maxWidth: 240 }} inputMode="decimal" placeholder={t("mln so'm, masalan 640")} value={price} onChange={(e) => setPrice(e.target.value)} aria-label={t('Narx')} />
          <button type="button" className="btn small" disabled={!picked.size || saving} onClick={applyPrice}>{t('{n} ta xonadonga qo\'llash', { n: picked.size })}</button>
        </div>
      )}
      <div className="shx-chess">
        <table>
          <tbody>
            {floors.map((f) => {
              const row = local.filter((a) => a.floor === f).sort((a, b) => a.ord - b.ord);
              return (
                <tr key={f}>
                  <th scope="row"><button type="button" className="btn ghost small" style={{ minHeight: 32, padding: '0 8px' }} onClick={() => apply(row.map((a) => a.id))} title={t('Butun qavat')}>{t('{n}-q', { n: f })}</button></th>
                  {row.map((a) => (
                    <td key={a.id}>
                      <button
                        type="button"
                        className={picked.has(a.id) ? 'picked' : ''}
                        style={{ background: STATUS_COLOR[a.status], color: STATUS_INK[a.status] }}
                        onClick={() => apply([a.id])}
                        title={`№ ${a.number} · ${a.rooms} ${t('xona')} · ${a.area} m² · ${som(a.price ?? a.area * priceM2)} ${t("so'm")}`}
                        aria-label={`№ ${a.number}, ${t(statusText(a.status))}`}
                      >
                        <span>№ {a.number}</span>
                        <small>{a.rooms}x · {mln(a.price ?? a.area * priceM2)}{a.price ? '*' : ''}</small>
                      </button>
                    </td>
                  ))}
                  {Array.from({ length: maxCols - row.length }, (_, i) => <td key={`e${i}`} />)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <span className="muted" style={{ fontSize: 12 }}>{t("* — alohida belgilangan narx. Qolganlari: maydon × {n} so'm.", { n: som(priceM2) })} {t('{b} blok', { b: block.name })}</span>
    </section>
  );
}
