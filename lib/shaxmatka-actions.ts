'use server';

import { revalidatePath } from 'next/cache';
import { sessionClient } from './supabase-server';
import { cleanUnits, STATUSES, type AptStatus, type Block } from './shaxmatka';
import { getShaxmatka } from './shaxmatka-data';

// Admin va quruvchi kabineti uchun umumiy amallar. Ruxsatni RLS hal qiladi
// (admin yoki shu majmua quruvchisining a'zosi).

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function client() {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  return user ? sb : null;
}

const uuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s);
const clamp = (n: unknown, lo: number, hi: number, def: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
};
const img = (u: unknown) => (typeof u === 'string' && u.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`) ? u : null);
const refresh = () => revalidatePath('/[lang]', 'layout');

export async function loadShaxmatka(complexId: string) {
  const sb = await client();
  if (!sb || !uuid(complexId)) return null;
  return getShaxmatka(complexId, sb as never);
}

export async function saveBlock(input: Partial<Block> & { complex_id: string }): Promise<Res<{ id: string }>> {
  const sb = await client();
  if (!sb || !uuid(input.complex_id)) return { ok: false, error: 'Kirish kerak' };
  const floors = Math.round(clamp(input.floors, 1, 60, 9));
  const row = {
    complex_id: input.complex_id,
    name: String(input.name ?? 'A').trim().slice(0, 20) || 'A',
    floors,
    commercial_floors: Math.round(clamp(input.commercial_floors, 0, Math.min(5, floors - 1), 0)),
    floor_height: clamp(input.floor_height, 2.5, 6, 3),
    width_m: clamp(input.width_m, 6, 300, 36),
    depth_m: clamp(input.depth_m, 6, 120, 16),
    rotation_deg: ((Number(input.rotation_deg) || 0) % 360 + 360) % 360,
    pos_x: clamp(input.pos_x, -500, 500, 0),
    pos_z: clamp(input.pos_z, -500, 500, 0),
    facade_url: img(input.facade_url),
    facade_top: clamp(input.facade_top, 0, 100, 8),
    facade_bottom: clamp(input.facade_bottom, 0, 100, 92),
    color: /^#[0-9a-f]{6}$/i.test(String(input.color)) ? String(input.color) : '#E9E4DA',
    model_url: typeof input.model_url === 'string' && /^https:\/\/.+\.(glb|gltf)(\?.*)?$/i.test(input.model_url) ? input.model_url : null,
    sort: Math.round(clamp(input.sort, 0, 99, 0)),
  };
  if (row.facade_bottom <= row.facade_top + 5) return { ok: false, error: "Fasad chiziqlari noto'g'ri" };
  const q = uuid(input.id)
    ? sb.from('complex_blocks').update(row).eq('id', input.id!).select('id').single()
    : sb.from('complex_blocks').insert(row).select('id').single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: error?.message || 'Saqlanmadi' };
  // Qavatlar soni kamaygan bo'lsa, ortiqcha xonadonlar o'chadi.
  await sb.from('apartments').delete().eq('block_id', data.id).or(`floor.gt.${row.floors},floor.lte.${row.commercial_floors}`);
  await renumber(sb, data.id);
  refresh();
  return { ok: true, id: data.id };
}

export async function deleteBlock(id: string): Promise<Res> {
  const sb = await client();
  if (!sb || !uuid(id)) return { ok: false, error: 'Kirish kerak' };
  const { error } = await sb.from('complex_blocks').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function savePlan(input: { id?: string; block_id: string; name?: string; floor_from: number; floor_to: number; image_url?: string | null; ceiling_m?: number; units: unknown }): Promise<Res<{ id: string }>> {
  const sb = await client();
  if (!sb || !uuid(input.block_id)) return { ok: false, error: 'Kirish kerak' };
  const { data: block } = await sb.from('complex_blocks').select('id, complex_id, floors, commercial_floors').eq('id', input.block_id).maybeSingle();
  if (!block) return { ok: false, error: 'Blok topilmadi' };
  const from = Math.round(Number(input.floor_from));
  const to = Math.round(Number(input.floor_to));
  if (!(from > block.commercial_floors && to <= block.floors && to >= from)) {
    return { ok: false, error: `Qavatlar ${block.commercial_floors + 1}–${block.floors} oralig'ida bo'lsin` };
  }
  const units = cleanUnits(input.units);
  if (!units.length) return { ok: false, error: 'Kamida bitta xonadon chizing' };

  const { data: others } = await sb.from('floor_plans').select('id, floor_from, floor_to, name').eq('block_id', block.id);
  const clash = (others || []).find((p) => p.id !== input.id && !(to < p.floor_from || from > p.floor_to));
  if (clash) return { ok: false, error: `${clash.floor_from}–${clash.floor_to}-qavatlar boshqa planirovkada ("${clash.name || 'nomsiz'}")` };

  const row = {
    complex_id: block.complex_id,
    block_id: block.id,
    name: String(input.name ?? '').slice(0, 60),
    floor_from: from,
    floor_to: to,
    image_url: img(input.image_url),
    ceiling_m: clamp(input.ceiling_m, 2.4, 5, 2.8),
    units,
  };
  const q = uuid(input.id)
    ? sb.from('floor_plans').update(row).eq('id', input.id!).select('id').single()
    : sb.from('floor_plans').insert(row).select('id').single();
  const { data: plan, error } = await q;
  if (error || !plan) return { ok: false, error: error?.message || 'Saqlanmadi' };

  // Xonadonlarni qayta yaratish: holat va narx (qavat + kalit bo'yicha) saqlanadi.
  const { data: existing } = await sb.from('apartments').select('id, floor, unit_key, status, price, plan_id').eq('block_id', block.id).gte('floor', from).lte('floor', to);
  const prev = new Map((existing || []).map((a) => [`${a.floor}:${a.unit_key}`, a]));
  const rows = [];
  for (let f = from; f <= to; f++) {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const old = prev.get(`${f}:${u.key}`);
      rows.push({
        complex_id: block.complex_id, block_id: block.id, plan_id: plan.id, unit_key: u.key, ord: i, floor: f,
        number: old ? undefined : `${f}${u.key}`, rooms: u.rooms, area: u.area,
        status: old?.status ?? 'sotuvda', price: old?.price ?? null,
      });
    }
  }
  const keep = new Set(rows.map((r) => `${r.floor}:${r.unit_key}`));
  const drop = [
    ...(existing || []).filter((a) => !keep.has(`${a.floor}:${a.unit_key}`)).map((a) => a.id),
  ];
  // Shu planirovkaga tegishli, lekin endi oraliqdan tashqaridagi xonadonlar.
  const { data: outside } = await sb.from('apartments').select('id').eq('plan_id', plan.id).or(`floor.lt.${from},floor.gt.${to}`);
  drop.push(...(outside || []).map((a) => a.id));
  if (drop.length) await sb.from('apartments').delete().in('id', drop);
  const { error: upErr } = await sb.from('apartments').upsert(
    rows.map((r) => ({ ...r, number: r.number ?? `${r.floor}${r.unit_key}` })),
    { onConflict: 'block_id,floor,unit_key' },
  );
  if (upErr) return { ok: false, error: upErr.message };
  await renumber(sb, block.id);
  refresh();
  return { ok: true, id: plan.id };
}

export async function deletePlan(id: string): Promise<Res> {
  const sb = await client();
  if (!sb || !uuid(id)) return { ok: false, error: 'Kirish kerak' };
  const { data: p } = await sb.from('floor_plans').select('block_id').eq('id', id).maybeSingle();
  const { error } = await sb.from('floor_plans').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  if (p) await renumber(sb, p.block_id);
  refresh();
  return { ok: true };
}

/** Xonadon holati va narxini o'zgartirish (bitta bosish bilan "sotildi"). */
export async function updateApartments(changes: { id: string; status?: AptStatus; price?: number | null }[]): Promise<Res<{ count: number }>> {
  const sb = await client();
  if (!sb) return { ok: false, error: 'Kirish kerak' };
  const list = changes.filter((c) => uuid(c.id)).slice(0, 500);
  const groups = new Map<string, string[]>();
  for (const c of list) {
    const patch: Record<string, unknown> = {};
    if (c.status && STATUSES.includes(c.status)) patch.status = c.status;
    if (c.price !== undefined) patch.price = c.price === null || !(Number(c.price) > 0) ? null : Math.round(Number(c.price));
    if (!Object.keys(patch).length) continue;
    const k = JSON.stringify(patch);
    groups.set(k, [...(groups.get(k) || []), c.id]);
  }
  let count = 0;
  for (const [k, ids] of groups) {
    const { data, error } = await sb.from('apartments').update(JSON.parse(k)).in('id', ids).select('id');
    if (error) return { ok: false, error: error.message };
    count += data?.length ?? 0;
  }
  if (list.length && !count) return { ok: false, error: "Ruxsat yo'q yoki xonadon topilmadi" };
  refresh();
  return { ok: true, count };
}

/** Blok bo'yicha ketma-ket raqamlash: pastki qavatdan yuqoriga, qavat ichida chizilgan tartibda. */
async function renumber(sb: Awaited<ReturnType<typeof sessionClient>>, blockId: string) {
  const { data } = await sb.from('apartments').select('id, number, floor, ord').eq('block_id', blockId).order('floor').order('ord');
  if (!data) return;
  const changed = data.map((a, i) => ({ ...a, n: String(i + 1) })).filter((a) => a.number !== a.n);
  // Raqam unique emas, shuning uchun to'g'ridan-to'g'ri yangilash mumkin; kichik paketlar bilan.
  for (let i = 0; i < changed.length; i += 50) {
    await Promise.all(changed.slice(i, i + 50).map((a) => sb.from('apartments').update({ number: a.n }).eq('id', a.id)));
  }
}
