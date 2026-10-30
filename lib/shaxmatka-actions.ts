'use server';

import { revalidatePath } from 'next/cache';
import { sessionClient } from './supabase-server';
import { autoLayout, cleanUnits, round1, STATUSES, type AptStatus, type Block, type ImportRow } from './shaxmatka';
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

/**
 * Excel import.
 * mode "build": jadvaldagi bloklar uchun bino noldan quriladi (eski planirovka va xonadonlar o'chadi).
 * mode "update": mavjud xonadonlar blok + raqam (yoki qavat + tartib) bo'yicha topilib, narx va holat yangilanadi.
 */
export async function importShaxmatka(complexId: string, mode: 'build' | 'update', input: ImportRow[]): Promise<Res<{ blocks: number; apartments: number; skipped: number }>> {
  const sb = await client();
  if (!sb || !uuid(complexId)) return { ok: false, error: 'Kirish kerak' };
  const rows = (Array.isArray(input) ? input : []).slice(0, 3000).filter((r) => r && Number(r.floor) >= 1 && Number(r.area) > 0 && Number(r.rooms) >= 1);
  if (!rows.length) return { ok: false, error: "Jadvalda xonadon topilmadi" };
  const blockNames = [...new Set(rows.map((r) => String(r.block || 'A').slice(0, 20)))].sort();
  const { data: existing } = await sb.from('complex_blocks').select('*').eq('complex_id', complexId);

  if (mode === 'update') {
    let n = 0, skipped = 0;
    const { data: apts } = await sb.from('apartments').select('id, block_id, floor, ord, number').eq('complex_id', complexId).limit(5000);
    const byBlock = new Map((existing || []).map((b) => [String(b.name), b.id]));
    const changes: { id: string; status?: AptStatus; price?: number | null }[] = [];
    const perFloor = new Map<string, number>();
    for (const r of rows) {
      const bid = byBlock.get(String(r.block || 'A'));
      const key = `${bid}:${r.floor}`;
      const ord = perFloor.get(key) ?? 0;
      perFloor.set(key, ord + 1);
      const a = (apts || []).find((x) => x.block_id === bid && (r.number ? x.number === r.number : x.floor === r.floor && x.ord === ord));
      if (!a) { skipped++; continue; }
      const c: { id: string; status?: AptStatus; price?: number | null } = { id: a.id };
      if (r.status && STATUSES.includes(r.status)) c.status = r.status;
      if (r.price !== null && r.price !== undefined) c.price = r.price;
      if (c.status === undefined && c.price === undefined) { skipped++; continue; }
      changes.push(c);
      n++;
    }
    for (let i = 0; i < changes.length; i += 400) {
      const res = await updateApartments(changes.slice(i, i + 400));
      if (!res.ok) return res;
    }
    refresh();
    return { ok: true, blocks: byBlock.size, apartments: n, skipped };
  }

  let total = 0;
  for (const [bi, name] of blockNames.entries()) {
    const list = rows.filter((r) => String(r.block || 'A') === name);
    const floors = [...new Set(list.map((r) => r.floor))].sort((a, b) => a - b);
    const top = floors[floors.length - 1];
    const minFloor = floors[0];
    const byFloor = new Map(floors.map((f) => [f, list.filter((r) => r.floor === f)]));
    // Bino o'lchami: eng katta qavat maydoni bo'yicha (umumiy maydon + yo'lak va devorlar ~12%).
    const D = 17;
    const maxArea = Math.max(...floors.map((f) => byFloor.get(f)!.reduce((s, r) => s + r.area, 0)));
    const W = Math.max(12, Math.min(150, Math.round(((maxArea * 1.12) / (D - 1.8)) * 10) / 10));
    const old = (existing || []).find((b) => b.name === name);
    const row = {
      complex_id: complexId, name, floors: top, commercial_floors: Math.min(5, Math.max(0, minFloor - 1)),
      width_m: old ? Number(old.width_m) : W, depth_m: old ? Number(old.depth_m) : D,
      pos_x: old ? Number(old.pos_x) : (bi - (blockNames.length - 1) / 2) * (W + 8), pos_z: old ? Number(old.pos_z) : 0, sort: bi,
    };
    const res = old
      ? await sb.from('complex_blocks').update({ floors: row.floors, commercial_floors: row.commercial_floors, sort: bi }).eq('id', old.id).select('id, width_m, depth_m').single()
      : await sb.from('complex_blocks').insert(row).select('id, width_m, depth_m').single();
    if (res.error || !res.data) return { ok: false, error: res.error?.message || 'Blok saqlanmadi' };
    const bid = res.data.id;
    const BW = Number(res.data.width_m), BD = Number(res.data.depth_m);
    await sb.from('floor_plans').delete().eq('block_id', bid);

    // Bir xil qavatlar (xonalar va maydonlar ketma-ketligi bir xil) bitta planirovkaga birlashadi.
    const sig = (f: number) => byFloor.get(f)!.map((r) => `${r.rooms}:${r.area}`).join('|');
    let i = 0;
    while (i < floors.length) {
      let j = i;
      while (j + 1 < floors.length && floors[j + 1] === floors[j] + 1 && sig(floors[j + 1]) === sig(floors[i])) j++;
      const f0 = floors[i], f1 = floors[j];
      const sample = byFloor.get(f0)!;
      const units = autoLayout(BW, BD, sample.map((r) => r.rooms), 1.8, sample.map((r) => r.area));
      const { data: plan, error: pe } = await sb.from('floor_plans').insert({
        complex_id: complexId, block_id: bid, name: f0 === f1 ? `${f0}-qavat` : `Tipik qavat ${f0}–${f1}`, floor_from: f0, floor_to: f1, units,
      }).select('id').single();
      if (pe || !plan) return { ok: false, error: pe?.message || 'Planirovka saqlanmadi' };
      const apts: Record<string, unknown>[] = [];
      for (let f = f0; f <= f1; f++) {
        byFloor.get(f)!.forEach((r, k) => {
          apts.push({
            complex_id: complexId, block_id: bid, plan_id: plan.id, unit_key: units[k].key, ord: k, floor: f,
            number: r.number || '', rooms: r.rooms, area: round1(r.area), status: r.status ?? 'sotuvda', price: r.price,
          });
        });
      }
      for (let c = 0; c < apts.length; c += 500) {
        const { error } = await sb.from('apartments').insert(apts.slice(c, c + 500));
        if (error) return { ok: false, error: error.message };
      }
      total += apts.length;
      i = j + 1;
    }
    // Raqam berilmagan bo'lsa — ketma-ket raqamlash.
    if (list.some((r) => !r.number)) await renumber(sb, bid);
  }
  refresh();
  return { ok: true, blocks: blockNames.length, apartments: total, skipped: 0 };
}
