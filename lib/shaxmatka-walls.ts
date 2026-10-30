import { exteriorEdges, type Pt, type RoomDef, type UnitDef } from './shaxmatka';

// Planirovkadan devorlar: xonalar orasidagi umumiy qirralarda eshik, tashqi qirralarda deraza,
// yo'lakka qaragan dahliz qirrasida kirish eshigi.

export type Opening = { t0: number; t1: number; kind: 'door' | 'arch' | 'window' | 'entrance' };
export type WallSeg = { a: Pt; b: Pt; kind: 'inner' | 'exterior' | 'party'; openings: Opening[]; rooms?: [number, number] };

const EPS = 0.12;

function project(p: Pt, a: Pt, dir: Pt): number {
  return (p[0] - a[0]) * dir[0] + (p[1] - a[1]) * dir[1];
}

function distToLine(p: Pt, a: Pt, dir: Pt): number {
  return Math.abs((p[0] - a[0]) * dir[1] - (p[1] - a[1]) * dir[0]);
}

function edges(poly: Pt[]): [Pt, Pt][] {
  return poly.map((p, i) => [p, poly[(i + 1) % poly.length]] as [Pt, Pt]);
}

function mergeIntervals(iv: [number, number][]): [number, number][] {
  const s = [...iv].sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const [a, b] of s) {
    if (out.length && a <= out[out.length - 1][1] + 0.01) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
    else out.push([a, b]);
  }
  return out;
}

const isWet = (n: string) => /hammom|hojat|vanna|санузел|ванн/i.test(n);
const isHall = (n: string) => /dahliz|koridor|прихож|холл/i.test(n);
const isOpen = (a: string, b: string) => /oshxona|кухн/i.test(a) && /mehmon|гостин/i.test(b);

function windowsAlong(len: number): Opening[] {
  if (len < 1.6) return [];
  const n = Math.max(1, Math.floor(len / 3.2));
  const w = Math.min(1.5, len / n - 0.8);
  const out: Opening[] = [];
  for (let i = 0; i < n; i++) {
    const c = (len / n) * (i + 0.5);
    out.push({ t0: c - w / 2, t1: c + w / 2, kind: 'window' });
  }
  return out;
}

/** Bitta xonadon devorlari. W, D — blok o'lchami (tashqi qirralarni aniqlash uchun). */
export function unitWalls(u: UnitDef, W: number, D: number): WallSeg[] {
  const rooms: RoomDef[] = u.rooms_detail && u.rooms_detail.length ? u.rooms_detail : [{ name: 'Xona', area: u.area, poly: u.poly }];
  const ext = exteriorEdges(u.poly, W, D, 0);
  const segs: WallSeg[] = [];
  let entranceDone = false;

  rooms.forEach((r, i) => {
    for (const [a, b] of edges(r.poly)) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.05) continue;
      const dir: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const covered: [number, number][] = [];
      // Boshqa xonalar bilan umumiy qismlar.
      rooms.forEach((o, j) => {
        if (j === i) return;
        for (const [c, d] of edges(o.poly)) {
          if (distToLine(c, a, dir) > EPS || distToLine(d, a, dir) > EPS) continue;
          const t0 = Math.max(0, Math.min(project(c, a, dir), project(d, a, dir)));
          const t1 = Math.min(len, Math.max(project(c, a, dir), project(d, a, dir)));
          if (t1 - t0 < 0.05) continue;
          covered.push([t0, t1]);
          if (j > i) {
            const ov = t1 - t0;
            const pa: Pt = [a[0] + dir[0] * t0, a[1] + dir[1] * t0];
            const pb: Pt = [a[0] + dir[0] * t1, a[1] + dir[1] * t1];
            const openings: Opening[] = [];
            const pair = [r.name, o.name];
            const needsDoor = isHall(r.name) || isHall(o.name) || isOpen(r.name, o.name) || isOpen(o.name, r.name);
            if (needsDoor && ov > 1.0) {
              const open = isOpen(r.name, o.name) || isOpen(o.name, r.name);
              const w = open ? Math.min(1.6, ov - 0.4) : isWet(pair[0]) || isWet(pair[1]) ? 0.75 : 0.85;
              const c0 = ov / 2;
              openings.push({ t0: c0 - w / 2, t1: c0 + w / 2, kind: open ? 'arch' : 'door' });
            }
            segs.push({ a: pa, b: pb, kind: 'inner', openings, rooms: [i, j] });
          }
        }
      });
      // Qolgan qismlar: tashqi devor yoki qo'shni/yo'lak devori.
      const merged = mergeIntervals(covered);
      let cur = 0;
      const free: [number, number][] = [];
      for (const [s0, s1] of merged) { if (s0 > cur + 0.05) free.push([cur, s0]); cur = Math.max(cur, s1); }
      if (len > cur + 0.05) free.push([cur, len]);
      for (const [t0, t1] of free) {
        const pa: Pt = [a[0] + dir[0] * t0, a[1] + dir[1] * t0];
        const pb: Pt = [a[0] + dir[0] * t1, a[1] + dir[1] * t1];
        const l = t1 - t0;
        const onExt = ext.some((e) => {
          const el = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
          const ed: Pt = [(e.b[0] - e.a[0]) / el, (e.b[1] - e.a[1]) / el];
          return distToLine(pa, e.a, ed) < EPS && distToLine(pb, e.a, ed) < EPS;
        });
        let openings: Opening[] = [];
        if (onExt) openings = isWet(r.name) ? (l > 1.2 ? [{ t0: l / 2 - 0.35, t1: l / 2 + 0.35, kind: 'window' }] : []) : windowsAlong(l);
        else if (!entranceDone && isHall(r.name) && l > 1.2) {
          openings = [{ t0: 0.25, t1: 1.2, kind: 'entrance' }];
          entranceDone = true;
        }
        segs.push({ a: pa, b: pb, kind: onExt ? 'exterior' : 'party', openings });
      }
    }
  });
  // Eshiksiz qolgan xonalarga eng uzun umumiy devorda eshik ochamiz (yotoqxona mehmonxonadan va h.k.).
  const reachable = new Set<number>();
  rooms.forEach((r, i) => { if (isHall(r.name)) reachable.add(i); });
  if (!reachable.size) reachable.add(0);
  for (let pass = 0; pass < rooms.length; pass++) {
    let grew = false;
    for (const s of segs) {
      if (!s.rooms || !s.openings.length) continue;
      const [x, y] = s.rooms;
      if (reachable.has(x) && !reachable.has(y)) { reachable.add(y); grew = true; }
      else if (reachable.has(y) && !reachable.has(x)) { reachable.add(x); grew = true; }
    }
    if (grew) continue;
    const cand = segs
      .filter((s) => s.rooms && !s.openings.length && reachable.has(s.rooms[0]) !== reachable.has(s.rooms[1]))
      .map((s) => ({ s, len: Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), wet: s.rooms!.some((k) => isWet(rooms[k].name)) }))
      .filter((c) => c.len > 1)
      .sort((p, q) => Number(p.wet) - Number(q.wet) || q.len - p.len)[0];
    if (!cand) break;
    cand.s.openings.push({ t0: cand.len / 2 - 0.42, t1: cand.len / 2 + 0.42, kind: 'door' });
  }

  // Dahliz topilmasa — birinchi ichki (party) devorga kirish eshigi.
  if (!entranceDone) {
    const s = segs.find((x) => x.kind === 'party' && Math.hypot(x.b[0] - x.a[0], x.b[1] - x.a[1]) > 1.4);
    if (s) s.openings = [{ t0: 0.3, t1: 1.25, kind: 'entrance' }];
  }
  return segs;
}

/** Devor bo'laklari: [t0, t1, z0, z1] — uzunlik bo'yicha va balandlik bo'yicha. */
export function wallPieces(len: number, openings: Opening[], H: number): { t0: number; t1: number; z0: number; z1: number; glass?: boolean; door?: boolean }[] {
  const ops = openings.filter((o) => o.t1 > o.t0).map((o) => ({ ...o, t0: Math.max(0, o.t0), t1: Math.min(len, o.t1) })).sort((x, y) => x.t0 - y.t0);
  const out: { t0: number; t1: number; z0: number; z1: number; glass?: boolean; door?: boolean }[] = [];
  let cur = 0;
  for (const o of ops) {
    if (o.t0 > cur) out.push({ t0: cur, t1: o.t0, z0: 0, z1: H });
    const top = o.kind === 'window' ? 2.3 : o.kind === 'arch' ? 2.3 : 2.1;
    if (top < H) out.push({ t0: o.t0, t1: o.t1, z0: Math.min(top, H), z1: H });
    if (o.kind === 'window') {
      out.push({ t0: o.t0, t1: o.t1, z0: 0, z1: Math.min(0.85, H) });
      if (H > 0.85) out.push({ t0: o.t0, t1: o.t1, z0: 0.85, z1: Math.min(top, H), glass: true });
    }
    if (o.kind === 'entrance' && H > 2) out.push({ t0: o.t0, t1: o.t1, z0: 0, z1: 2.1, door: true });
    cur = o.t1;
  }
  if (cur < len) out.push({ t0: cur, t1: len, z0: 0, z1: H });
  return out;
}
