import { publicClient } from './supabase';
import { cleanUnits, type Apartment, type Block, type FloorPlan, type Shaxmatka } from './shaxmatka';

const num = (v: unknown) => Number(v);

export function normBlock(b: Record<string, unknown>): Block {
  return {
    ...(b as unknown as Block),
    floors: num(b.floors), commercial_floors: num(b.commercial_floors), floor_height: num(b.floor_height),
    width_m: num(b.width_m), depth_m: num(b.depth_m), rotation_deg: num(b.rotation_deg), pos_x: num(b.pos_x), pos_z: num(b.pos_z),
    facade_top: num(b.facade_top), facade_bottom: num(b.facade_bottom), sort: num(b.sort),
  };
}

export function normPlan(p: Record<string, unknown>): FloorPlan {
  return { ...(p as unknown as FloorPlan), ceiling_m: num(p.ceiling_m), units: cleanUnits(p.units) };
}

export function normApt(a: Record<string, unknown>): Apartment {
  return { ...(a as unknown as Apartment), area: num(a.area), price: a.price == null ? null : num(a.price) };
}

type Sb = ReturnType<typeof publicClient>;

/** Majmuaning bloklari, planirovkalari va xonadonlari. */
export async function getShaxmatka(complexId: string, sb: Sb = publicClient()): Promise<Shaxmatka> {
  const [{ data: blocks }, { data: plans }, { data: apts }] = await Promise.all([
    sb.from('complex_blocks').select('*').eq('complex_id', complexId).order('sort').order('name'),
    sb.from('floor_plans').select('*').eq('complex_id', complexId).order('floor_from'),
    sb.from('apartments').select('*').eq('complex_id', complexId).order('floor').order('ord').limit(5000),
  ]);
  return {
    blocks: (blocks || []).map(normBlock),
    plans: (plans || []).map(normPlan),
    apartments: (apts || []).map(normApt),
  };
}

/** Bitta xonadon sahifasi uchun: xonadon, blok, planirovka va majmua. */
export async function getApartment(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = publicClient();
  const { data: a } = await sb.from('apartments').select('*').eq('id', id).maybeSingle();
  if (!a) return null;
  const [{ data: block }, { data: plan }, { data: complex }] = await Promise.all([
    sb.from('complex_blocks').select('*').eq('id', a.block_id).maybeSingle(),
    sb.from('floor_plans').select('*').eq('id', a.plan_id).maybeSingle(),
    sb.from('complexes').select('id, slug, name, city, district, address, lat, lng, price_m2, installment_months, first_payment_pct, developer_id, status, promised_date, kadastr_status, is_sample, cover_url').eq('id', a.complex_id).eq('published', true).maybeSingle(),
  ]);
  if (!block || !plan || !complex) return null;
  const { data: floorApts } = await sb.from('apartments').select('*').eq('block_id', a.block_id).eq('floor', a.floor).order('ord');
  return { apartment: normApt(a), block: normBlock(block), plan: normPlan(plan), complex, floorApartments: (floorApts || []).map(normApt) };
}

/** Bir nechta xonadon (taqqoslash uchun). */
export async function getApartments(ids: string[]) {
  const ok = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 4);
  if (!ok.length) return [];
  const sb = publicClient();
  const { data: apts } = await sb.from('apartments').select('*').in('id', ok);
  if (!apts?.length) return [];
  const blockIds = [...new Set(apts.map((a) => a.block_id))];
  const planIds = [...new Set(apts.map((a) => a.plan_id))];
  const cxIds = [...new Set(apts.map((a) => a.complex_id))];
  const [{ data: blocks }, { data: plans }, { data: cxs }] = await Promise.all([
    sb.from('complex_blocks').select('*').in('id', blockIds),
    sb.from('floor_plans').select('*').in('id', planIds),
    sb.from('complexes').select('id, slug, name, lat, lng, price_m2, installment_months, first_payment_pct, status, promised_date, kadastr_status').in('id', cxIds).eq('published', true),
  ]);
  return ok.flatMap((id) => {
    const a = apts.find((x) => x.id === id);
    const b = blocks?.find((x) => x.id === a?.block_id);
    const p = plans?.find((x) => x.id === a?.plan_id);
    const c = cxs?.find((x) => x.id === a?.complex_id);
    return a && b && p && c ? [{ apartment: normApt(a), block: normBlock(b), plan: normPlan(p), complex: c }] : [];
  });
}
