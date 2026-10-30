// Shaxmatka: JK → blok → qavat planirovkasi → xonadon.
// Planirovka koordinatalari metrda: x o'ngga (0..width_m), y pastga (0..depth_m).
// rotation_deg = 0 bo'lsa planirovkaning tepasi (y = 0) shimolga qaragan.

export type Pt = [number, number];
export type RoomDef = { name: string; area: number; poly: Pt[] };
export type UnitDef = {
  key: string;
  rooms: number;
  area: number;
  poly: Pt[];
  /** Qo'lda kiritilgan oyna tomonlari (N, NE, E, SE, S, SW, W, NW). Bo'sh bo'lsa konturdan hisoblanadi. */
  windows?: string[];
  rooms_detail?: RoomDef[];
};

export type Block = {
  id: string;
  complex_id: string;
  name: string;
  floors: number;
  commercial_floors: number;
  floor_height: number;
  width_m: number;
  depth_m: number;
  rotation_deg: number;
  pos_x: number;
  pos_z: number;
  facade_url: string | null;
  facade_top: number;
  facade_bottom: number;
  color: string;
  model_url: string | null;
  sort: number;
};

export type FloorPlan = {
  id: string;
  complex_id: string;
  block_id: string;
  name: string;
  floor_from: number;
  floor_to: number;
  image_url: string | null;
  ceiling_m: number;
  units: UnitDef[];
};

export type AptStatus = 'sotuvda' | 'bron' | 'sotilgan' | 'yopiq';

export type Apartment = {
  id: string;
  complex_id: string;
  block_id: string;
  plan_id: string;
  unit_key: string;
  ord: number;
  floor: number;
  number: string;
  rooms: number;
  area: number;
  status: AptStatus;
  price: number | null;
  updated_at?: string;
};

export type Shaxmatka = { blocks: Block[]; plans: FloorPlan[]; apartments: Apartment[] };

export const STATUSES: AptStatus[] = ['sotuvda', 'bron', 'sotilgan', 'yopiq'];
export const STATUS_LABEL: Record<AptStatus, string> = { sotuvda: 'Sotuvda', bron: 'Bron', sotilgan: 'Sotilgan', yopiq: 'Sotuvda emas' };
export const STATUS_COLOR: Record<AptStatus, string> = { sotuvda: '#2F9E6B', bron: '#D89A22', sotilgan: '#A8B1B0', yopiq: '#C9CED6' };
export const STATUS_INK: Record<AptStatus, string> = { sotuvda: '#FFFFFF', bron: '#FFFFFF', sotilgan: '#14213D', yopiq: '#3D4657' };

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function polyArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function centroid(p: Pt[]): Pt {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = p.length || 1;
    return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

export function bbox(p: Pt[]) {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function pointInPoly([x, y]: Pt, p: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const rectPoly = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [round2(x), round2(y)] as Pt);

export function planFor(plans: FloorPlan[], blockId: string, floor: number): FloorPlan | undefined {
  return plans.find((p) => p.block_id === blockId && floor >= p.floor_from && floor <= p.floor_to);
}

export function aptPrice(a: Pick<Apartment, 'price' | 'area'>, priceM2: number): number {
  return a.price ?? Math.round(a.area * priceM2);
}

/** Bino qavat bo'yicha: qaysi qavatlar savdoda (tijorat qavatlari tashqari). */
export function residentialFloors(b: Pick<Block, 'floors' | 'commercial_floors'>): number[] {
  const out: number[] = [];
  for (let f = b.floors; f > b.commercial_floors; f--) out.push(f);
  return out;
}

// ---------- Oyna tomonlari va quyosh ----------

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export const COMPASS_UZ: Record<string, string> = {
  N: 'shimol', NE: 'shimoli-sharq', E: 'sharq', SE: 'janubi-sharq', S: 'janub', SW: "janubi-g'arb", W: "g'arb", NW: "shimoli-g'arb",
};
const COMPASS_AZ: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

export function azToCompass(az: number): string {
  return COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8];
}

/** Xonadon konturining bino tashqi chegarasida yotgan qirralari: [p1, p2, azimut]. */
export function exteriorEdges(poly: Pt[], W: number, D: number, rotation: number, eps = 0.15): { a: Pt; b: Pt; az: number; len: number }[] {
  const out: { a: Pt; b: Pt; az: number; len: number }[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.8) continue;
    let side: number | null = null;
    if (Math.abs(a[1]) < eps && Math.abs(b[1]) < eps) side = 0;
    else if (Math.abs(a[0] - W) < eps && Math.abs(b[0] - W) < eps) side = 90;
    else if (Math.abs(a[1] - D) < eps && Math.abs(b[1] - D) < eps) side = 180;
    else if (Math.abs(a[0]) < eps && Math.abs(b[0]) < eps) side = 270;
    if (side !== null) out.push({ a, b, az: (side + rotation + 360) % 360, len });
  }
  return out;
}

/** Oynalar qaragan tomonlar azimuti (gradus, shimoldan soat yo'nalishida). */
export function windowAzimuths(u: UnitDef, b: Pick<Block, 'width_m' | 'depth_m' | 'rotation_deg'>): number[] {
  if (u.windows && u.windows.length) return u.windows.map((w) => COMPASS_AZ[w]).filter((x) => x !== undefined);
  const set = new Set<number>();
  for (const e of exteriorEdges(u.poly, b.width_m, b.depth_m, b.rotation_deg)) set.add(Math.round(e.az));
  return [...set];
}

export function windowLabels(u: UnitDef, b: Pick<Block, 'width_m' | 'depth_m' | 'rotation_deg'>): string[] {
  return [...new Set(windowAzimuths(u, b).map(azToCompass))].sort((x, y) => COMPASS.indexOf(x as never) - COMPASS.indexOf(y as never));
}

const RAD = Math.PI / 180;
/** O'zbekiston vaqti UTC+5, yozgi vaqtga o'tilmaydi. */
export const UZ_OFFSET_H = 5;

/** Quyosh holati: azimut (shimoldan soat yo'nalishida) va balandlik, gradusda. date — UTC vaqt. */
export function sunPosition(date: Date, lat: number, lng: number): { azimuth: number; altitude: number } {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const lst = (gmst * 15 + lng) * RAD;
  const H = lst - ra;
  const phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));
  return { azimuth: ((az / RAD) + 360) % 360, altitude: alt / RAD };
}

/** Berilgan kunda oynalarga to'g'ri quyosh tushadigan vaqt (mahalliy soat). */
export function sunHours(azimuths: number[], lat: number, lng: number, day: Date): { hours: number; from: string; to: string } {
  if (!azimuths.length) return { hours: 0, from: '', to: '' };
  const y = day.getUTCFullYear(), m = day.getUTCMonth(), dd = day.getUTCDate();
  let minutes = 0, first = -1, last = -1;
  for (let t = 5 * 60; t <= 21 * 60; t += 10) {
    const utc = new Date(Date.UTC(y, m, dd, 0, t - UZ_OFFSET_H * 60));
    const s = sunPosition(utc, lat, lng);
    if (s.altitude < 6) continue;
    const lit = azimuths.some((a) => {
      const diff = Math.abs(((s.azimuth - a + 540) % 360) - 180);
      return diff < 80;
    });
    if (lit) { minutes += 10; if (first < 0) first = t; last = t; }
  }
  const hm = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  return { hours: Math.round(minutes / 6) / 10, from: first >= 0 ? hm(first) : '', to: last >= 0 ? hm(last + 10) : '' };
}

// ---------- Avtomatik planirovka ----------

export const ROOM_NAMES = ['Mehmonxona', 'Yotoqxona', 'Oshxona', 'Hammom', 'Dahliz', 'Balkon', 'Kiyimxona'] as const;

/** To'g'ri to'rtburchak xonadonni xonalarga bo'ladi. corridor — yo'lak qaysi tomonda. */
export function autoRooms(x0: number, y0: number, x1: number, y1: number, rooms: number, corridor: 'top' | 'bottom'): RoomDef[] {
  const w = x1 - x0;
  const d = y1 - y0;
  const inner = Math.min(3, Math.max(2.2, d * 0.32));
  const innerY = corridor === 'top' ? [y0, y0 + inner] : [y1 - inner, y1];
  const outerY = corridor === 'top' ? [y0 + inner, y1] : [y0, y1 - inner];
  const out: RoomDef[] = [];
  const push = (name: string, a: number, b: number, c: number, e: number) => {
    const poly = rectPoly(a, b, c, e);
    out.push({ name, area: round1(polyArea(poly)), poly });
  };
  // Ichki qism: dahliz va hammom.
  const bathW = Math.min(3, w * 0.34);
  const wardW = rooms >= 2 && w - bathW > 6 ? Math.min(2.2, w * 0.18) : 0;
  push('Dahliz', x0, innerY[0], x1 - bathW - wardW, innerY[1]);
  push('Hammom', x1 - bathW - wardW, innerY[0], x1 - wardW, innerY[1]);
  if (wardW) push('Kiyimxona', x1 - wardW, innerY[0], x1, innerY[1]);
  // Tashqi qism: oshxona, mehmonxona, yotoqxonalar.
  const parts: [string, number][] = rooms <= 1
    ? [['Oshxona', 0.38], ['Mehmonxona', 0.62]]
    : [['Oshxona', 0.22], ['Mehmonxona', 0.34], ...Array.from({ length: rooms - 1 }, () => ['Yotoqxona', 0.44 / (rooms - 1)] as [string, number])];
  let x = x0;
  parts.forEach(([name, share], i) => {
    const nx = i === parts.length - 1 ? x1 : x + w * share;
    push(name, x, outerY[0], nx, outerY[1]);
    x = nx;
  });
  return out;
}

/** Tipik qavat: o'rtada yo'lak, ikki qator xonadon. mix — xonalar soni ketma-ketligi. */
export function autoLayout(W: number, D: number, mix: number[], corridor = 1.8): UnitDef[] {
  const top = mix.slice(0, Math.ceil(mix.length / 2));
  const bottom = mix.slice(Math.ceil(mix.length / 2));
  const cy0 = D / 2 - corridor / 2;
  const cy1 = D / 2 + corridor / 2;
  const weight = (r: number) => 0.7 + r * 0.55;
  const units: UnitDef[] = [];
  let k = 0;
  const row = (list: number[], ya: number, yb: number, side: 'top' | 'bottom') => {
    const tot = list.reduce((s, r) => s + weight(r), 0);
    let x = 0;
    list.forEach((r, i) => {
      const nx = i === list.length - 1 ? W : round2(x + (W * weight(r)) / tot);
      const poly = rectPoly(x, ya, nx, yb);
      const rooms_detail = autoRooms(x, ya, nx, yb, r, side);
      units.push({ key: String.fromCharCode(65 + k++), rooms: r, area: round1(polyArea(poly)), poly, rooms_detail });
      x = nx;
    });
  };
  row(top, 0, cy0, 'bottom');
  row([...bottom].reverse(), cy1, D, 'top');
  return units;
}

/** Yo'lak: xonadonlar egallamagan qism (2D va 3D da yo'lak sifatida chiziladi). */
export function corridorRect(units: UnitDef[], W: number, D: number): [number, number, number, number] | null {
  const topMax = Math.max(0, ...units.filter((u) => centroid(u.poly)[1] < D / 2).map((u) => bbox(u.poly).y1));
  const botMin = Math.min(D, ...units.filter((u) => centroid(u.poly)[1] >= D / 2).map((u) => bbox(u.poly).y0));
  if (botMin - topMax < 0.5) return null;
  return [0, topMax, W, botMin];
}

export function cleanUnits(raw: unknown): UnitDef[] {
  if (!Array.isArray(raw)) return [];
  const pt = (q: unknown): Pt | null => (Array.isArray(q) && q.length === 2 && q.every((n) => Number.isFinite(Number(n))) ? [round2(Number(q[0])), round2(Number(q[1]))] : null);
  const poly = (p: unknown): Pt[] => (Array.isArray(p) ? (p.map(pt).filter(Boolean) as Pt[]) : []);
  const seen = new Set<string>();
  return raw.slice(0, 60).flatMap((u: Record<string, unknown>) => {
    const key = String(u?.key ?? '').slice(0, 8);
    const pg = poly(u?.poly);
    if (!key || seen.has(key) || pg.length < 3) return [];
    seen.add(key);
    const rooms = Math.max(1, Math.min(9, Math.round(Number(u.rooms) || 1)));
    const area = Number(u.area) > 0 ? round1(Number(u.area)) : round1(polyArea(pg));
    const windows = Array.isArray(u.windows) ? u.windows.map(String).filter((w) => (COMPASS as readonly string[]).includes(w)) : [];
    const rooms_detail = Array.isArray(u.rooms_detail)
      ? u.rooms_detail.slice(0, 20).flatMap((r: Record<string, unknown>) => {
          const rp = poly(r?.poly);
          return rp.length >= 3 ? [{ name: String(r.name ?? '').slice(0, 30) || 'Xona', area: Number(r.area) > 0 ? round1(Number(r.area)) : round1(polyArea(rp)), poly: rp }] : [];
        })
      : [];
    return [{ key, rooms, area, poly: pg, windows, rooms_detail }];
  });
}
