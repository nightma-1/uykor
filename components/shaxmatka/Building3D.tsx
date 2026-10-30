'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  centroid, corridorRect, planFor, polyArea, sunPosition, STATUS_COLOR, UZ_OFFSET_H,
  type Apartment, type Block, type FloorPlan, type Pt, type RoomDef, type UnitDef,
} from '@/lib/shaxmatka';
import { unitWalls, wallPieces } from '@/lib/shaxmatka-walls';
import type { TFn } from '@/lib/i18n';

export type Mode3D = 'building' | 'floor' | 'walk';

type Props = {
  t: TFn;
  blocks: Block[];
  plans: FloorPlan[];
  apartments: Apartment[];
  lat: number;
  lng: number;
  selBlock: string | null;
  selFloor: number | null;
  selApt: string | null;
  mode: Mode3D;
  /** Mahalliy vaqt (soat, kasr bilan) — quyosh holati uchun. */
  hour: number;
  dayOfYear: Date;
  isDimmed: (a: Apartment) => boolean;
  light: boolean;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
  onPickFloor: (blockId: string, floor: number) => void;
  onPickApt: (aptId: string) => void;
  onWalk?: (x: number, y: number, heading: number) => void;
};

const ACCENT = '#2346A0';
const EYE = 1.6;

type Ctx = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  site: THREE.Group;
  interior: THREE.Group;
  blockGroups: Map<string, THREE.Group>;
  shells: THREE.Mesh[];
  unitMeshes: THREE.Mesh[];
  labels: HTMLDivElement;
  labelItems: { el: HTMLDivElement; pos: THREE.Vector3 }[];
  tip: HTMLDivElement;
  hovered: THREE.Mesh | null;
  tween: { p0: THREE.Vector3; p1: THREE.Vector3; t0v: THREE.Vector3; t1v: THREE.Vector3; start: number; dur: number } | null;
  walk: { group: THREE.Group; x: number; z: number; y: number; yaw: number; pitch: number; segs: [number, number, number, number][]; W: number; D: number } | null;
  keys: Set<string>;
  radius: number;
  raf: number;
  visible: boolean;
  last: number;
  lastWalkEmit: number;
  camReady: boolean;
};

// ---------- Materiallar va teksturalar ----------

function facadeTexture(wall: string, commercial: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 240;
  const g = c.getContext('2d')!;
  g.fillStyle = wall; g.fillRect(0, 0, 256, 240);
  const glass = g.createLinearGradient(0, 0, 0, 240);
  glass.addColorStop(0, '#5E7F98'); glass.addColorStop(0.55, '#2E4A63'); glass.addColorStop(1, '#3B5A74');
  if (commercial) {
    g.fillStyle = glass; g.fillRect(12, 26, 232, 200);
    g.fillStyle = '#D8DDE2'; g.fillRect(126, 26, 4, 200); g.fillRect(12, 150, 232, 3);
  } else {
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 228, 256, 12);
    g.fillStyle = '#F7F5F0'; g.fillRect(56, 44, 144, 132);
    g.fillStyle = glass; g.fillRect(62, 50, 132, 120);
    g.fillStyle = '#F7F5F0'; g.fillRect(126, 50, 4, 120); g.fillRect(62, 108, 132, 3);
    g.fillStyle = '#CFC8BB'; g.fillRect(50, 176, 156, 7);
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = THREE.RepeatWrapping;
  tx.anisotropy = 4;
  return tx;
}

function facadeMaterials(b: Block, commercial: boolean): THREE.Material[] {
  const base = facadeTexture(commercial ? '#B9B2A6' : b.color, commercial);
  const along = (len: number) => {
    const tx = base.clone();
    tx.needsUpdate = true;
    tx.repeat.set(Math.max(1, Math.round(len / 3.3)), 1);
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85 });
  };
  const sideX = along(b.depth_m);
  const sideZ = along(b.width_m);
  const top = new THREE.MeshStandardMaterial({ color: '#B8B4AC', roughness: 0.95 });
  return [sideX, sideX, top, top, sideZ, sideZ];
}

const M = {
  floorWood: new THREE.MeshStandardMaterial({ color: '#C9A47A', roughness: 0.7 }),
  floorTile: new THREE.MeshStandardMaterial({ color: '#D9DCDD', roughness: 0.5 }),
  wall: new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.92 }),
  wallExt: new THREE.MeshStandardMaterial({ color: '#E8E2D6', roughness: 0.92 }),
  wallCut: new THREE.MeshStandardMaterial({ color: '#FBFAF7', roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#BFD9EA', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false }),
  door: new THREE.MeshStandardMaterial({ color: '#8A6A4A', roughness: 0.6 }),
  slab: new THREE.MeshStandardMaterial({ color: '#DCD8D0', roughness: 0.95 }),
  corridor: new THREE.MeshStandardMaterial({ color: '#C7CBD1', roughness: 0.9 }),
  ceiling: new THREE.MeshStandardMaterial({ color: '#FAFAF8', roughness: 1, side: THREE.BackSide }),
  fabric: new THREE.MeshStandardMaterial({ color: '#7D8FA6', roughness: 0.95 }),
  fabric2: new THREE.MeshStandardMaterial({ color: '#C9B8A0', roughness: 0.95 }),
  linen: new THREE.MeshStandardMaterial({ color: '#F2EFE8', roughness: 0.95 }),
  wood: new THREE.MeshStandardMaterial({ color: '#8C6B4F', roughness: 0.65 }),
  white: new THREE.MeshStandardMaterial({ color: '#F6F6F4', roughness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2B2F36', roughness: 0.5 }),
  rug: new THREE.MeshStandardMaterial({ color: '#B66A4C', roughness: 1 }),
  green: new THREE.MeshStandardMaterial({ color: '#4E7D47', roughness: 0.9 }),
};

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}

/** Planirovka nuqtasidan blok ichki koordinatasiga (x, z). */
const L = (p: Pt, W: number, D: number): [number, number] => [p[0] - W / 2, p[1] - D / 2];

function shapeMesh(poly: Pt[], W: number, D: number, mat: THREE.Material, y: number): THREE.Mesh {
  const s = new THREE.Shape(poly.map((p) => { const [x, z] = L(p, W, D); return new THREE.Vector2(x, -z); }));
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

// ---------- Devorlar va mebel ----------

function addWalls(group: THREE.Group, u: UnitDef, W: number, D: number, y: number, H: number, cut: boolean, segsOut?: [number, number, number, number][]) {
  for (const s of unitWalls(u, W, D)) {
    const [ax, az] = L(s.a, W, D);
    const [bx, bz] = L(s.b, W, D);
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.05) continue;
    const ang = Math.atan2(bz - az, bx - ax);
    const th = s.kind === 'exterior' ? 0.3 : s.kind === 'party' ? 0.2 : 0.12;
    const mat = cut ? M.wallCut : s.kind === 'exterior' ? M.wallExt : M.wall;
    for (const pc of wallPieces(len, cut ? s.openings.filter((o) => o.kind !== 'window') : s.openings, H)) {
      const w = pc.t1 - pc.t0;
      const h = pc.z1 - pc.z0;
      if (w < 0.02 || h < 0.02) continue;
      const mid = (pc.t0 + pc.t1) / 2;
      const cx = ax + Math.cos(ang) * mid;
      const cz = az + Math.sin(ang) * mid;
      const m = box(w, h, pc.glass ? 0.03 : pc.door ? 0.06 : th, pc.glass ? M.glass : pc.door ? M.door : mat, cx, y + pc.z0 + h / 2, cz, !pc.glass);
      m.rotation.y = -ang;
      group.add(m);
      if (segsOut && pc.z0 < 0.3) {
        segsOut.push([ax + Math.cos(ang) * pc.t0, az + Math.sin(ang) * pc.t0, ax + Math.cos(ang) * pc.t1, az + Math.sin(ang) * pc.t1]);
      }
    }
  }
}

function furnish(group: THREE.Group, r: RoomDef, W: number, D: number, y: number) {
  const xs = r.poly.map((p) => p[0] - W / 2);
  const zs = r.poly.map((p) => p[1] - D / 2);
  const x0 = Math.min(...xs) + 0.25, x1 = Math.max(...xs) - 0.25;
  const z0 = Math.min(...zs) + 0.25, z1 = Math.max(...zs) - 0.25;
  const w = x1 - x0, d = z1 - z0;
  if (w < 1 || d < 1) return;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const long = w >= d;
  const n = r.name.toLowerCase();
  const add = (m: THREE.Mesh) => { m.position.y += y; group.add(m); };
  if (n.includes('yotoq')) {
    const bw = Math.min(1.6, (long ? d : w) - 0.6), bl = 2.0;
    if (long) {
      add(box(bl, 0.45, bw, M.wood, x0 + bl / 2 + 0.05, 0.225, cz));
      add(box(bl - 0.2, 0.18, bw - 0.1, M.linen, x0 + bl / 2 + 0.15, 0.54, cz));
      add(box(0.08, 1.0, bw + 0.1, M.wood, x0 + 0.05, 0.5, cz));
      add(box(0.6, 0.55, 2.0, M.white, x1 - 0.3, 1.1, cz, true));
    } else {
      add(box(bw, 0.45, bl, M.wood, cx, 0.225, z0 + bl / 2 + 0.05));
      add(box(bw - 0.1, 0.18, bl - 0.2, M.linen, cx, 0.54, z0 + bl / 2 + 0.15));
      add(box(bw + 0.1, 1.0, 0.08, M.wood, cx, 0.5, z0 + 0.05));
      add(box(2.0, 2.2, 0.6, M.white, cx, 1.1, z1 - 0.3));
    }
  } else if (n.includes('mehmon')) {
    add(box(Math.min(2.4, w * 0.7), 0.01, Math.min(1.8, d * 0.6), M.rug, cx, 0.005, cz, false));
    if (long) {
      add(box(Math.min(2.4, w * 0.6), 0.45, 0.9, M.fabric, cx, 0.225, z1 - 0.45));
      add(box(Math.min(2.4, w * 0.6), 0.45, 0.2, M.fabric, cx, 0.6, z1 - 0.1));
      add(box(1.0, 0.4, 0.55, M.wood, cx, 0.2, cz));
      add(box(1.8, 0.5, 0.4, M.dark, cx, 0.25, z0 + 0.2));
      add(box(1.4, 0.8, 0.05, M.dark, cx, 1.2, z0 + 0.05));
    } else {
      add(box(0.9, 0.45, Math.min(2.4, d * 0.6), M.fabric, x1 - 0.45, 0.225, cz));
      add(box(0.2, 0.45, Math.min(2.4, d * 0.6), M.fabric, x1 - 0.1, 0.6, cz));
      add(box(0.55, 0.4, 1.0, M.wood, cx, 0.2, cz));
      add(box(0.4, 0.5, 1.8, M.dark, x0 + 0.2, 0.25, cz));
      add(box(0.05, 0.8, 1.4, M.dark, x0 + 0.05, 1.2, cz));
    }
    add(box(0.4, 0.6, 0.4, M.green, x0 + 0.3, 0.3, z0 + 0.3));
  } else if (n.includes('oshxona')) {
    if (long) {
      add(box(w, 0.9, 0.6, M.white, cx, 0.45, z0 + 0.3));
      add(box(w, 0.04, 0.62, M.dark, cx, 0.92, z0 + 0.3));
      add(box(w, 0.7, 0.35, M.white, cx, 1.85, z0 + 0.18));
    } else {
      add(box(0.6, 0.9, d, M.white, x0 + 0.3, 0.45, cz));
      add(box(0.62, 0.04, d, M.dark, x0 + 0.3, 0.92, cz));
      add(box(0.35, 0.7, d, M.white, x0 + 0.18, 1.85, cz));
    }
    const tx = long ? cx : cx + 0.4, tz = long ? cz + 0.4 : cz;
    add(box(1.2, 0.05, 0.8, M.wood, tx, 0.75, tz));
    for (const [dx, dz] of [[-0.35, -0.55], [0.35, -0.55], [-0.35, 0.55], [0.35, 0.55]]) add(box(0.4, 0.45, 0.4, M.fabric2, tx + dx, 0.225, tz + dz));
  } else if (n.includes('hammom') || n.includes('hojat')) {
    if (long) add(box(1.6, 0.55, 0.75, M.white, x0 + 0.8, 0.275, z0 + 0.38));
    else add(box(0.75, 0.55, 1.6, M.white, x0 + 0.38, 0.275, z0 + 0.8));
    add(box(0.5, 0.85, 0.4, M.white, x1 - 0.25, 0.425, z1 - 0.2));
    add(box(0.4, 0.4, 0.6, M.white, long ? x1 - 0.25 : cx, 0.2, long ? z0 + 0.3 : z1 - 0.3));
  } else if (n.includes('dahliz')) {
    if (long) add(box(Math.min(1.2, w * 0.4), 0.9, 0.35, M.wood, x0 + 0.6, 0.45, z0 + 0.18));
    else add(box(0.35, 0.9, Math.min(1.2, d * 0.4), M.wood, x0 + 0.18, 0.45, z0 + 0.6));
  } else if (n.includes('kiyim')) {
    add(box(long ? w : 0.5, 2.1, long ? 0.5 : d, M.white, long ? cx : x0 + 0.25, 1.05, long ? z0 + 0.25 : cz));
  }
}

// ---------- Sahna ----------

function seeded(seed: number) {
  let s = seed % 2147483647 || 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildSite(ctx: Ctx, blocks: Block[], apartments: Apartment[], isDimmed: (a: Apartment) => boolean) {
  const { site } = ctx;
  site.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
  site.clear();
  ctx.blockGroups.clear();
  ctx.shells = [];

  let rad = 30;
  for (const b of blocks) rad = Math.max(rad, Math.hypot(b.pos_x, b.pos_z) + Math.hypot(b.width_m, b.depth_m) / 2 + 20);
  ctx.radius = rad;

  const ground = new THREE.Mesh(new THREE.CircleGeometry(rad * 3, 64), new THREE.MeshStandardMaterial({ color: '#9DB77E', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  site.add(ground);

  const obstacles: { x: number; z: number; r: number }[] = [];
  for (const b of blocks) {
    const g = new THREE.Group();
    g.position.set(b.pos_x, 0, b.pos_z);
    g.rotation.y = -(b.rotation_deg * Math.PI) / 180;
    g.userData = { blockId: b.id };
    obstacles.push({ x: b.pos_x, z: b.pos_z, r: Math.hypot(b.width_m, b.depth_m) / 2 + 6 });

    const pave = new THREE.Mesh(new THREE.PlaneGeometry(b.width_m + 14, b.depth_m + 14), new THREE.MeshStandardMaterial({ color: '#D8D2C6', roughness: 1 }));
    pave.rotation.x = -Math.PI / 2; pave.position.y = 0.02; pave.receiveShadow = true;
    g.add(pave);

    const fh = b.floor_height;
    const resMat = facadeMaterials(b, false);
    const comMat = facadeMaterials(b, true);
    const geo = new THREE.BoxGeometry(b.width_m, fh, b.depth_m);
    const shellGeo = new THREE.BoxGeometry(b.width_m + 0.35, fh * 0.94, b.depth_m + 0.35);
    for (let f = 1; f <= b.floors; f++) {
      const commercial = f <= b.commercial_floors;
      const m = new THREE.Mesh(geo, commercial ? comMat : resMat);
      m.position.y = (f - 0.5) * fh;
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { kind: 'floor', blockId: b.id, floor: f };
      g.add(m);
      if (!commercial) {
        const apts = apartments.filter((a) => a.block_id === b.id && a.floor === f);
        const free = apts.filter((a) => a.status === 'sotuvda' && !isDimmed(a)).length;
        const sh = new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({ color: free >= 2 ? STATUS_COLOR.sotuvda : free === 1 ? STATUS_COLOR.bron : '#8E979C', transparent: true, opacity: 0, depthWrite: false }));
        sh.position.y = (f - 0.5) * fh;
        sh.userData = { kind: 'shell', blockId: b.id, floor: f, free, total: apts.length, heat: 0 };
        g.add(sh);
        ctx.shells.push(sh);
      }
    }
    const roof = box(b.width_m + 0.4, 0.5, b.depth_m + 0.4, new THREE.MeshStandardMaterial({ color: '#9C978E' }), 0, b.floors * fh + 0.25, 0);
    roof.userData = { kind: 'roof', blockId: b.id };
    g.add(roof);
    const label = document.createElement('div');
    label.className = 'shx3d-block';
    label.textContent = `${b.name}`;
    ctx.labels.appendChild(label);
    ctx.labelItems.push({ el: label, pos: new THREE.Vector3(b.pos_x, b.floors * fh + 2.2, b.pos_z) });
    if (b.model_url) loadModel(g, b);
    site.add(g);
    ctx.blockGroups.set(b.id, g);
  }

  // Daraxtlar va yo'laklar.
  const rnd = seeded(blocks.length * 97 + 13);
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.6, 6);
  const crownGeo = new THREE.SphereGeometry(1.3, 10, 8);
  const crownMat = new THREE.MeshStandardMaterial({ color: '#5E8C4E', roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6E5240' });
  let placed = 0;
  for (let i = 0; i < 400 && placed < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rad * (0.35 + rnd() * 0.75);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r)) continue;
    const s = 0.8 + rnd() * 0.6;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.set(x, 0.8 * s, z); trunk.scale.setScalar(s); trunk.castShadow = true;
    const crown = new THREE.Mesh(crownGeo, crownMat); crown.position.set(x, 2.3 * s, z); crown.scale.set(s, s * 1.1, s); crown.castShadow = true;
    site.add(trunk, crown);
    placed++;
  }
}

function loadModel(g: THREE.Group, b: Block) {
  import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    new GLTFLoader().load(b.model_url!, (gltf) => {
      const model = gltf.scene;
      const bb = new THREE.Box3().setFromObject(model);
      const size = bb.getSize(new THREE.Vector3());
      const scale = size.x > b.width_m * 3 || size.x < b.width_m / 3 ? b.width_m / Math.max(size.x, 0.01) : 1;
      model.scale.setScalar(scale);
      const bb2 = new THREE.Box3().setFromObject(model);
      const c = bb2.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -bb2.min.y, -c.z);
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      model.userData = { kind: 'model' };
      g.children.forEach((ch) => { if (ch.userData.kind === 'floor' || ch.userData.kind === 'roof') ch.visible = false; });
      g.add(model);
    });
  }).catch(() => undefined);
}

function clearInterior(ctx: Ctx) {
  ctx.interior.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
  ctx.interior.removeFromParent();
  ctx.interior = new THREE.Group();
  ctx.unitMeshes = [];
  ctx.labelItems = ctx.labelItems.filter((l) => {
    if (l.el.classList.contains('shx3d-apt')) { l.el.remove(); return false; }
    return true;
  });
}

export default function Building3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const pr = useRef(props);
  pr.current = props;

  // Ishga tushirish.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const el = host.current!;
    const light = pr.current.light;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !light, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, light ? 1 : 1.75));
    renderer.shadowMap.enabled = !light;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#CFE0EC');
    scene.fog = new THREE.Fog('#CFE0EC', 160, 520);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 1500);
    camera.position.set(60, 45, 70);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 8;
    controls.maxDistance = 260;
    const hemi = new THREE.HemisphereLight('#EAF2FA', '#8E9A7A', 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#FFF4E2', 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(window.innerWidth < 700 ? 1024 : 2048, window.innerWidth < 700 ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const site = new THREE.Group();
    scene.add(site);
    const labels = document.createElement('div');
    labels.className = 'shx3d-labels';
    el.appendChild(labels);
    const tip = document.createElement('div');
    tip.className = 'shx3d-tip';
    tip.hidden = true;
    el.appendChild(tip);

    const ctx: Ctx = {
      renderer, scene, camera, controls, sun, hemi, site, interior: new THREE.Group(), blockGroups: new Map(), shells: [], unitMeshes: [],
      labels, labelItems: [], tip, hovered: null, tween: null, walk: null, keys: new Set(), radius: 40, raf: 0, visible: true, last: performance.now(), lastWalkEmit: 0, camReady: false,
    };
    ctxRef.current = ctx;

    const resize = () => {
      const r = el.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / Math.max(1, r.height);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const io = new IntersectionObserver(([e]) => { ctx.visible = e.isIntersecting; });
    io.observe(el);

    // Sichqoncha / barmoq.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pickAt = (x: number, y: number, list: THREE.Object3D[]) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(list, false)[0]?.object as THREE.Mesh | undefined;
    };
    let down: { x: number; y: number; id: number } | null = null;
    let look: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      if (pr.current.mode === 'walk') { look = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); }
    };
    const onMove = (e: PointerEvent) => {
      if (pr.current.mode === 'walk' && look && ctx.walk) {
        ctx.walk.yaw -= (e.clientX - look.x) * 0.005;
        ctx.walk.pitch = Math.max(-1.1, Math.min(1.1, ctx.walk.pitch - (e.clientY - look.y) * 0.004));
        look = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.pointerType !== 'mouse') return;
      const p = pr.current;
      if (p.mode === 'building') {
        const hit = pickAt(e.clientX, e.clientY, ctx.shells.filter((s) => s.visible));
        ctx.hovered = hit ?? null;
        canvas.style.cursor = hit ? 'pointer' : 'grab';
        if (hit) {
          const { floor, free, total, blockId } = hit.userData;
          const b = p.blocks.find((x) => x.id === blockId);
          tip.hidden = false;
          tip.textContent = `${b && p.blocks.length > 1 ? `${b.name} · ` : ''}${p.t('{n}-qavat', { n: floor })} · ${total ? p.t('{n} ta sotuvda', { n: free }) : p.t("ma'lumot yo'q")}`;
          const r = canvas.getBoundingClientRect();
          tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 10}px)`;
        } else tip.hidden = true;
      } else if (p.mode === 'floor') {
        const hit = pickAt(e.clientX, e.clientY, ctx.unitMeshes);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
        ctx.hovered = hit ?? null;
        tip.hidden = true;
      }
    };
    const onUp = (e: PointerEvent) => {
      look = null;
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const p = pr.current;
      if (p.mode === 'building') {
        const hit = pickAt(e.clientX, e.clientY, ctx.shells.filter((s) => s.visible));
        if (hit) p.onPickFloor(hit.userData.blockId, hit.userData.floor);
      } else if (p.mode === 'floor') {
        const hit = pickAt(e.clientX, e.clientY, ctx.unitMeshes);
        if (hit?.userData.aptId) p.onPickApt(hit.userData.aptId);
        else {
          const sh = pickAt(e.clientX, e.clientY, ctx.shells.filter((s) => s.visible));
          if (sh && !(sh.userData.blockId === p.selBlock && sh.userData.floor === p.selFloor)) p.onPickFloor(sh.userData.blockId, sh.userData.floor);
        }
      }
    };
    const onLeave = () => { tip.hidden = true; ctx.hovered = null; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    const kd = (e: KeyboardEvent) => { if (pr.current.mode === 'walk' && !(e.target as HTMLElement)?.closest?.('input,textarea,select')) { ctx.keys.add(e.key.toLowerCase()); if (e.key.startsWith('Arrow')) e.preventDefault(); } };
    const ku = (e: KeyboardEvent) => ctx.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const tmp = new THREE.Vector3();
    const loop = (now: number) => {
      ctx.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - ctx.last) / 1000);
      ctx.last = now;
      if (!ctx.visible || document.hidden) return;
      const p = pr.current;

      if (p.mode === 'walk' && ctx.walk) {
        const w = ctx.walk;
        const k = ctx.keys;
        let fwd = (k.has('w') || k.has('arrowup') || k.has('ц') ? 1 : 0) - (k.has('s') || k.has('arrowdown') || k.has('ы') ? 1 : 0);
        let side = (k.has('d') || k.has('в') ? 1 : 0) - (k.has('a') || k.has('ф') ? 1 : 0);
        if (k.has('arrowleft')) w.yaw += dt * 1.8;
        if (k.has('arrowright')) w.yaw -= dt * 1.8;
        const js = p.joystick.current;
        if (Math.abs(js.y) > 0.08) fwd += -js.y;
        if (Math.abs(js.x) > 0.08) w.yaw -= js.x * dt * 2.0;
        const speed = 1.9 * dt;
        let nx = w.x + (-Math.sin(w.yaw) * fwd + Math.cos(w.yaw) * side) * speed;
        let nz = w.z + (-Math.cos(w.yaw) * fwd - Math.sin(w.yaw) * side) * speed;
        for (let it = 0; it < 2; it++) {
          for (const [x1, z1, x2, z2] of w.segs) {
            const vx = x2 - x1, vz = z2 - z1;
            const l2 = vx * vx + vz * vz || 1;
            const t = Math.max(0, Math.min(1, ((nx - x1) * vx + (nz - z1) * vz) / l2));
            const px = x1 + vx * t, pz = z1 + vz * t;
            const dx = nx - px, dz = nz - pz;
            const d = Math.hypot(dx, dz);
            if (d < 0.3 && d > 1e-6) { nx = px + (dx / d) * 0.3; nz = pz + (dz / d) * 0.3; }
          }
        }
        w.x = nx; w.z = nz;
        const g = w.group;
        tmp.set(w.x, w.y + EYE, w.z);
        g.localToWorld(tmp);
        camera.position.copy(tmp);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(w.pitch, w.yaw + g.rotation.y, 0);
        if (p.onWalk && now - ctx.lastWalkEmit > 90) {
          ctx.lastWalkEmit = now;
          p.onWalk(w.x + w.W / 2, w.z + w.D / 2, Math.atan2(-Math.cos(w.yaw), -Math.sin(w.yaw)));
        }
      } else {
        if (ctx.tween) {
          const tw = ctx.tween;
          const k = Math.min(1, (now - tw.start) / tw.dur);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          camera.position.lerpVectors(tw.p0, tw.p1, e);
          controls.target.lerpVectors(tw.t0v, tw.t1v, e);
          if (k >= 1) ctx.tween = null;
        }
        controls.update();
      }

      // Qavat qobiqlari: issiqlik xaritasi, hover, tanlangan.
      for (const s of ctx.shells) {
        const mat = s.material as THREE.MeshBasicMaterial;
        const sel = s.userData.blockId === p.selBlock && s.userData.floor === p.selFloor;
        const target = p.mode === 'walk' ? 0 : sel && p.mode === 'building' ? 0.55 : s === ctx.hovered ? 0.5 : p.mode === 'building' ? s.userData.heat : 0;
        mat.opacity += (target - mat.opacity) * Math.min(1, dt * 10);
        if (sel || s === ctx.hovered) mat.color.set(ACCENT);
        else mat.color.set(s.userData.free >= 2 ? STATUS_COLOR.sotuvda : s.userData.free === 1 ? STATUS_COLOR.bron : '#8E979C');
      }
      for (const m of ctx.unitMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive.set(m === ctx.hovered ? '#334466' : '#000000');
      }

      renderer.render(scene, camera);

      // Yorliqlar.
      const r = canvas.getBoundingClientRect();
      for (const it of ctx.labelItems) {
        tmp.copy(it.pos).project(camera);
        const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && p.mode !== 'walk' && (!it.el.classList.contains('shx3d-block') || p.mode === 'building');
        it.el.style.display = vis ? '' : 'none';
        if (vis) it.el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * r.width}px, ${((1 - tmp.y) / 2) * r.height}px)`;
      }
    };
    ctx.raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(ctx.raf);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      controls.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      renderer.dispose();
      labels.remove(); tip.remove();
      ctxRef.current = null;
    };
  }, []);

  // Bino va hovli.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.labelItems.forEach((l) => l.el.remove());
    ctx.labelItems = [];
    buildSite(ctx, props.blocks, props.apartments, props.isDimmed);
    const r = ctx.radius;
    ctx.sun.shadow.camera.left = -r * 1.2; ctx.sun.shadow.camera.right = r * 1.2;
    ctx.sun.shadow.camera.top = r * 1.2; ctx.sun.shadow.camera.bottom = -r * 1.2;
    ctx.sun.shadow.camera.far = r * 6;
    ctx.sun.shadow.camera.updateProjectionMatrix();
    if (ctx.camReady) return;
    ctx.camReady = true;
    const top = Math.max(...props.blocks.map((b) => b.floors * b.floor_height), 20);
    ctx.camera.position.set(r * 1.25, top * 0.9 + 12, r * 1.45);
    ctx.controls.target.set(0, top * 0.4, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.blocks, props.apartments]);

  // Filtr o'zgarsa bino qayta qurilmaydi: faqat qavatlardagi mos bo'sh xonadonlar soni yangilanadi.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (const sh of ctx.shells) {
      const { blockId, floor } = sh.userData;
      sh.userData.free = props.apartments.filter((a) => a.block_id === blockId && a.floor === floor && a.status === 'sotuvda' && !props.isDimmed(a)).length;
    }
  }, [props.isDimmed, props.apartments]);

  // Quyosh.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const d = props.dayOfYear;
    const h = Math.floor(props.hour);
    const mnt = Math.round((props.hour - h) * 60);
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h - UZ_OFFSET_H, mnt));
    const s = sunPosition(utc, props.lat, props.lng);
    const alt = (Math.max(-6, s.altitude) * Math.PI) / 180;
    const az = (s.azimuth * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(alt) * Math.sin(az), Math.sin(Math.max(alt, 0.03)), -Math.cos(alt) * Math.cos(az)).normalize();
    const R = ctx.radius * 3;
    ctx.sun.position.copy(dir.multiplyScalar(R));
    ctx.sun.target.position.set(0, 0, 0);
    const day = Math.max(0, Math.min(1, s.altitude / 18));
    const dusk = Math.max(0, Math.min(1, 1 - Math.abs(s.altitude - 4) / 10));
    ctx.sun.intensity = 0.15 + 2.6 * day;
    ctx.sun.color.set(new THREE.Color('#FFB27A').lerp(new THREE.Color('#FFF4E2'), day));
    ctx.hemi.intensity = 0.25 + 0.75 * day;
    const sky = new THREE.Color('#1E2A44').lerp(new THREE.Color('#F0B88A'), dusk * (1 - day)).lerp(new THREE.Color('#CFE0EC'), day);
    (ctx.scene.background as THREE.Color).copy(sky);
    (ctx.scene.fog as THREE.Fog).color.copy(sky);
  }, [props.hour, props.dayOfYear, props.lat, props.lng]);

  // Rejim: bino / qavat / xonadon ichi.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { mode, selBlock, selFloor, selApt, blocks, plans, apartments, isDimmed } = props;
    clearInterior(ctx);
    ctx.walk = null;
    ctx.controls.enabled = mode !== 'walk';

    const b = blocks.find((x) => x.id === selBlock);
    const plan = b && selFloor ? planFor(plans, b.id, selFloor) : undefined;

    // Ko'rinish: tanlangan blokda yuqori qavatlar yashiriladi.
    for (const [bid, g] of ctx.blockGroups) {
      g.children.forEach((ch) => {
        const ud = ch.userData;
        if (!ud.kind) return;
        let vis = true;
        if (bid === selBlock && selFloor && mode !== 'building') {
          if (ud.kind === 'floor' || ud.kind === 'shell') vis = mode === 'walk' ? ud.floor !== selFloor : ud.floor < selFloor;
          if (ud.kind === 'roof' || ud.kind === 'model') vis = mode === 'walk';
        }
        if (ud.kind === 'floor' || ud.kind === 'roof') {
          const hasModel = g.children.some((c) => c.userData.kind === 'model');
          if (hasModel && (mode === 'building' || bid !== selBlock)) vis = false;
        }
        ch.visible = vis;
      });
    }

    const cam = ctx.camera;
    const go = (pos: THREE.Vector3, target: THREE.Vector3) => {
      ctx.tween = { p0: cam.position.clone(), p1: pos, t0v: ctx.controls.target.clone(), t1v: target, start: performance.now(), dur: 700 };
    };

    if (mode === 'building' || !b || !selFloor || !plan) {
      if (mode === 'building' && b && selFloor) {
        const g = ctx.blockGroups.get(b.id)!;
        const y = (selFloor - 0.5) * b.floor_height;
        const tgt = g.localToWorld(new THREE.Vector3(0, y, 0));
        const off = cam.position.clone().sub(ctx.controls.target).setLength(Math.max(b.width_m, b.floors * b.floor_height) * 1.7 + 20);
        go(tgt.clone().add(off), tgt);
      }
      return;
    }

    const g = ctx.blockGroups.get(b.id)!;
    const W = b.width_m, D = b.depth_m;
    const y0 = (selFloor - 1) * b.floor_height;
    const inner = new THREE.Group();
    g.add(inner);
    ctx.interior = inner;

    const slab = box(W + 0.3, 0.2, D + 0.3, M.slab, 0, y0 - 0.1, 0, false);
    inner.add(slab);
    const cor = corridorRect(plan.units, W, D);
    if (cor) inner.add(shapeMesh([[cor[0], cor[1]], [cor[2], cor[1]], [cor[2], cor[3]], [cor[0], cor[3]]], W, D, M.corridor, y0 + 0.01));

    const apts = apartments.filter((a) => a.block_id === b.id && a.floor === selFloor);
    if (mode === 'floor') {
      for (const u of plan.units) {
        const a = apts.find((x) => x.unit_key === u.key);
        const color = a ? (a.id === selApt ? ACCENT : STATUS_COLOR[a.status]) : '#C9CED6';
        const dim = a ? isDimmed(a) : true;
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, transparent: dim, opacity: dim ? 0.35 : 1 });
        const m = shapeMesh(u.poly, W, D, mat, y0 + 0.03);
        m.userData = { aptId: a?.id };
        inner.add(m);
        ctx.unitMeshes.push(m);
        for (const r of u.rooms_detail || []) {
          const rm = shapeMesh(r.poly, W, D, new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#FFFFFF'), 0.1), roughness: 0.85, transparent: dim, opacity: dim ? 0.35 : 1 }), y0 + 0.05);
          rm.userData = { aptId: a?.id };
          inner.add(rm);
          ctx.unitMeshes.push(rm);
        }
        addWalls(inner, u, W, D, y0, 1.15, true);
        if (a) {
          const [cx, cz] = L(centroid(u.poly), W, D);
          const el = document.createElement('div');
          el.className = 'shx3d-apt';
          el.innerHTML = `<b>№ ${a.number}</b><span>${a.rooms} ${props.t('xona')} · ${a.area} m²</span>`;
          ctx.labels.appendChild(el);
          ctx.labelItems.push({ el, pos: g.localToWorld(new THREE.Vector3(cx, y0 + 1.6, cz)) });
        }
      }
      const tgt = g.localToWorld(new THREE.Vector3(0, y0, 0));
      const span = Math.max(W, D);
      const dir = new THREE.Vector3(0.35, 1.05, 0.75).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
      go(tgt.clone().add(dir.setLength(span * 1.15 + 6)), tgt);
      return;
    }

    // Xonadon ichida yurish.
    const a = apartments.find((x) => x.id === selApt);
    const u = a && plan.units.find((x) => x.key === a.unit_key);
    if (!a || !u) return;
    const H = plan.ceiling_m;
    const segs: [number, number, number, number][] = [];
    for (const other of plan.units) {
      if (other.key === u.key) continue;
      addWalls(inner, other, W, D, y0, H, false);
    }
    addWalls(inner, u, W, D, y0, H, false, segs);
    const rooms = u.rooms_detail && u.rooms_detail.length ? u.rooms_detail : [{ name: 'Mehmonxona', area: u.area, poly: u.poly }];
    for (const r of rooms) {
      const wet = /hammom|hojat/i.test(r.name);
      inner.add(shapeMesh(r.poly, W, D, wet ? M.floorTile : M.floorWood, y0 + 0.02));
      furnish(inner, r, W, D, y0 + 0.02);
    }
    const ceil = shapeMesh(u.poly, W, D, M.ceiling, y0 + H);
    inner.add(ceil);
    // Ichki yorug'lik: umumiy yumshoq nur va har xonada shiftdagi chiroq.
    inner.add(new THREE.AmbientLight('#FFF4E6', 0.55));
    for (const r of rooms) {
      if (polyArea(r.poly) < 3) continue;
      const [lx, lz] = L(centroid(r.poly), W, D);
      const lamp = new THREE.PointLight('#FFE7C4', 4.5, 7, 1.4);
      lamp.position.set(lx, y0 + H - 0.35, lz);
      inner.add(lamp);
    }
    const hall = rooms.find((r) => /dahliz/i.test(r.name)) ?? rooms[0];
    const [sx, sz] = L(centroid(hall.poly), W, D);
    const [ux, uz] = L(centroid(u.poly), W, D);
    const yaw = Math.atan2(-(ux - sx), -(uz - sz));
    ctx.walk = { group: g, x: sx, z: sz, y: y0, yaw, pitch: -0.05, segs, W, D };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode, props.selBlock, props.selFloor, props.selApt, props.plans, props.apartments, props.blocks, props.isDimmed]);

  return (
    <div ref={host} className="shx3d">
      <canvas ref={canvasRef} className="shx3d-canvas" aria-label={props.t("Binoning 3D ko'rinishi")} />
    </div>
  );
}
