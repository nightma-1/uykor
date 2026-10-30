'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { mln } from '@/lib/format';
import { lp, T, type Lang } from '@/lib/i18n';
import { aptPrice, planFor, residentialFloors, STATUS_COLOR, sunPosition, UZ_OFFSET_H, type Apartment, type Shaxmatka as Data } from '@/lib/shaxmatka';
import { useCompare } from '@/lib/compare-client';
import FacadeView from './FacadeView';
import FloorPlanSvg, { statusText } from './FloorPlanSvg';
import ApartmentCard, { type CardComplex } from './ApartmentCard';
import type { Mode3D } from './Building3D';
import '@/app/shaxmatka.css';

const Building3D = dynamic(() => import('./Building3D'), {
  ssr: false,
  loading: () => <div className="shx3d shx3d-loading"><span>3D…</span></div>,
});

type Props = { lang: Lang; complex: CardComplex; data: Data };
type RoomsFilter = 0 | 1 | 2 | 3 | 4;

export default function Shaxmatka({ lang, complex, data }: Props) {
  const t = T(lang);
  const { blocks, plans, apartments } = data;
  const [view, setView] = useState<'fasad' | '3d'>('fasad');
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? '');
  const [floor, setFloor] = useState<number | null>(null);
  const [aptId, setAptId] = useState<string | null>(null);
  const [walk, setWalk] = useState(false);
  const [rooms, setRooms] = useState<RoomsFilter>(0);
  const [onlyFree, setOnlyFree] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [hour, setHour] = useState(13);
  const [light, setLight] = useState(false);
  const [walker, setWalker] = useState<{ x: number; y: number; heading: number } | null>(null);
  const joystick = useRef({ x: 0, y: 0 });
  const today = useMemo(() => new Date(), []);
  const cmp = useCompare();
  const ready = useRef(false);

  const block = blocks.find((b) => b.id === blockId) ?? blocks[0];
  const blockApts = useMemo(() => apartments.filter((a) => a.block_id === block?.id), [apartments, block?.id]);
  const plan = block && floor ? planFor(plans, block.id, floor) : undefined;
  const floorApts = useMemo(() => blockApts.filter((a) => a.floor === floor).sort((x, y) => x.ord - y.ord), [blockApts, floor]);
  const apt = apartments.find((a) => a.id === aptId) ?? null;

  const isDimmed = useCallback((a: Apartment) => {
    if (rooms && (rooms === 4 ? a.rooms < 4 : a.rooms !== rooms)) return true;
    if (onlyFree && a.status !== 'sotuvda') return true;
    if (maxPrice && aptPrice(a, complex.price_m2) > maxPrice * 1_000_000) return true;
    return false;
  }, [rooms, onlyFree, maxPrice, complex.price_m2]);

  const freeAll = apartments.filter((a) => a.status === 'sotuvda');
  const matches = apartments.filter((a) => !isDimmed(a) && a.status !== 'sotilgan' && a.status !== 'yopiq');
  const minFree = freeAll.length ? Math.min(...freeAll.map((a) => aptPrice(a, complex.price_m2))) : 0;
  const priceSteps = useMemo(() => {
    const ps = apartments.map((a) => aptPrice(a, complex.price_m2) / 1_000_000);
    if (!ps.length) return [];
    const lo = Math.ceil(Math.min(...ps) / 50) * 50, hi = Math.ceil(Math.max(...ps) / 50) * 50;
    const out: number[] = [];
    for (let v = lo; v <= hi && out.length < 12; v += Math.max(50, Math.round((hi - lo) / 8 / 50) * 50)) out.push(v);
    return out;
  }, [apartments, complex.price_m2]);

  // URL dan boshlang'ich tanlov va qurilmaga qarab ko'rinish.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    try { if (localStorage.getItem('uykor-3d-yengil') === '1') setLight(true); } catch { /* yo'q */ }
    // Hozir kunduz bo'lsa — hozirgi vaqt, aks holda tushlik payti.
    const now = new Date();
    const h = (now.getUTCHours() + UZ_OFFSET_H + now.getUTCMinutes() / 60) % 24;
    setHour(sunPosition(now, complex.lat, complex.lng).altitude > 18 ? Math.round(h * 4) / 4 : 13);
    const b = blocks.find((x) => x.name === sp.get('blok')) ?? blocks[0];
    if (b) setBlockId(b.id);
    const f = Number(sp.get('qavat'));
    if (b && f) {
      setFloor(f);
      const a = apartments.find((x) => x.block_id === b.id && x.floor === f && x.number === sp.get('xonadon'));
      if (a) setAptId(a.id);
    }
    if (sp.get('korinish') === '3d' || (sp.get('korinish') !== 'fasad' && window.matchMedia('(min-width: 900px)').matches)) setView('3d');
    if (sp.get('blok') || sp.get('qavat')) document.getElementById('xonadonlar')?.scrollIntoView({ block: 'start' });
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    const sp = new URLSearchParams(window.location.search);
    const set = (k: string, v: string | null) => (v ? sp.set(k, v) : sp.delete(k));
    set('blok', blocks.length > 1 && block ? block.name : floor ? block?.name ?? null : null);
    set('qavat', floor ? String(floor) : null);
    set('xonadon', apt ? apt.number : null);
    const q = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
  }, [block, floor, apt, blocks.length]);

  useEffect(() => {
    if (!walk) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setWalk(false); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [walk]);

  if (!block) return null;

  const pickFloor = (bid: string, f: number) => {
    setBlockId(bid);
    setFloor(f);
    setAptId(null);
    setWalk(false);
  };
  const pickApt = (id: string) => {
    setAptId(id);
    if (window.matchMedia('(max-width: 899px)').matches) setTimeout(() => document.getElementById('shx-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const startWalk = () => { setView('3d'); setWalk(true); };
  const mode: Mode3D = walk && apt ? 'walk' : floor ? 'floor' : 'building';
  const toggleLight = () => {
    const v = !light;
    setLight(v);
    try { localStorage.setItem('uykor-3d-yengil', v ? '1' : '0'); } catch { /* yo'q */ }
  };
  const floors = residentialFloors(block);

  return (
    <section className="card section shx" id="xonadonlar" aria-labelledby="shx-title">
      <div className="shx-top">
        <div>
          <h2 className="h2" id="shx-title">{t('Xonadon tanlash')}</h2>
          <span className="muted" style={{ fontSize: 14 }}>
            {t('{n} ta xonadon sotuvda', { n: freeAll.length })}{minFree ? ` · ${t("{n} mln so'mdan", { n: mln(minFree) })}` : ''}
            {(rooms || onlyFree || maxPrice) ? <b style={{ color: 'var(--ink)' }}> · {t('{n} ta mos', { n: matches.length })}</b> : ` · ${t('holati quruvchi tomonidan yangilanadi')}`}
          </span>
        </div>
        <div className="seg shx-view" role="group" aria-label={t("Ko'rinish")}>
          <button type="button" aria-pressed={view === 'fasad'} onClick={() => { setView('fasad'); setWalk(false); }}>{t('Fasad')}</button>
          <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button>
        </div>
      </div>

      <div className="shx-filters">
        {blocks.length > 1 && (
          <div className="seg" role="group" aria-label={t('Blok')}>
            {blocks.map((b) => (
              <button key={b.id} type="button" aria-pressed={b.id === block.id} onClick={() => { setBlockId(b.id); setFloor(null); setAptId(null); setWalk(false); }}>
                {t('{name} blok', { name: b.name })}
              </button>
            ))}
          </div>
        )}
        <div className="seg" role="group" aria-label={t('Xonalar')}>
          {([0, 1, 2, 3, 4] as RoomsFilter[]).map((r) => (
            <button key={r} type="button" aria-pressed={rooms === r} onClick={() => setRooms(r)}>{r === 0 ? t('Hammasi') : r === 4 ? '4+' : r}</button>
          ))}
        </div>
        {priceSteps.length > 1 && (
          <select className="input shx-select" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label={t('Narx gacha')}>
            <option value={0}>{t('Istalgan narx')}</option>
            {priceSteps.map((p) => <option key={p} value={p}>{t("{n} mln so'mgacha", { n: p })}</option>)}
          </select>
        )}
        <label className="check"><input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> {t('Faqat sotuvdagilar')}</label>
      </div>

      <div className="shx-body">
        <div className={`shx-stage${walk ? ' walking' : ''}`}>
          {view === '3d' ? (
            <>
              <Building3D
                key={light ? 'yengil' : 'toliq'}
                t={t}
                blocks={blocks}
                plans={plans}
                apartments={apartments}
                lat={complex.lat}
                lng={complex.lng}
                selBlock={floor ? block.id : null}
                selFloor={floor}
                selApt={aptId}
                mode={mode}
                hour={hour}
                dayOfYear={today}
                isDimmed={isDimmed}
                light={light}
                joystick={joystick}
                onPickFloor={pickFloor}
                onPickApt={pickApt}
                onWalk={(x, y, heading) => setWalker({ x, y, heading })}
              />
              <div className="shx3d-bar">
                <label className="shx-sun" title={t('Quyosh holati: bugungi sana, Samarqand vaqti')}>
                  <span aria-hidden="true">☀</span>
                  <input type="range" min={6} max={20} step={0.25} value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label={t('Kun vaqti')} />
                  <span className="num">{String(Math.floor(hour)).padStart(2, '0')}:{String(Math.round((hour % 1) * 60)).padStart(2, '0')}</span>
                </label>
                <button type="button" className="shx-chipbtn" aria-pressed={light} onClick={toggleLight} title={t("Telefon sekin ishlasa yoqing")}>{t('Yengil grafika')}</button>
              </div>
              {floor && !walk && (
                <button type="button" className="shx-back" onClick={() => { setFloor(null); setAptId(null); }}>{t('← Butun bino')}</button>
              )}
              {!floor && <div className="shx-hint">{t('Aylantiring, kattalashtiring, qavatni bosing')}</div>}
              {walk && apt && plan && (
                <>
                  <div className="shx-walk-top">
                    <span className="shx-walk-title">№ {apt.number} · {t('{n} xonali', { n: apt.rooms })} · {apt.area} m² · {t('{n}-qavat', { n: apt.floor })}</span>
                    <button type="button" className="btn small" onClick={() => setWalk(false)}>{t('✕ Chiqish')}</button>
                  </div>
                  <div className="shx-minimap" aria-hidden="true">
                    <FloorPlanSvg t={t} block={block} plan={plan} apartments={floorApts} focusKey={apt.unit_key} walker={walker} compact />
                  </div>
                  <Joystick target={joystick} />
                  <div className="shx-walk-hint">{t("Ekranni suring — atrofga qarash. Joystik yoki W A S D — yurish.")}</div>
                </>
              )}
            </>
          ) : (
            <FacadeView t={t} block={block} apartments={blockApts} selFloor={floor} isDimmed={isDimmed} onPick={(f) => pickFloor(block.id, f)} />
          )}
        </div>

        <div className="shx-side">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t('Qavat')}</div>
            <div className="shx-floors" role="group" aria-label={t('Qavat')}>
              {floors.map((f) => {
                const list = blockApts.filter((a) => a.floor === f);
                const free = list.filter((a) => a.status === 'sotuvda' && !isDimmed(a)).length;
                return (
                  <button key={f} type="button" aria-pressed={floor === f} disabled={!list.length} className={free ? '' : 'none'} onClick={() => pickFloor(block.id, f)} title={t('{n} ta sotuvda', { n: free })} aria-label={`${t('{n}-qavat', { n: f })}, ${t('{n} ta sotuvda', { n: free })}`}>
                    <span>{f}</span>{list.length > 0 && <small style={{ background: free ? STATUS_COLOR.sotuvda : 'transparent' }}>{free || '–'}</small>}
                  </button>
                );
              })}
            </div>
          </div>

          {floor && plan ? (
            <div className="shx-floorplan">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 17 }}>{blocks.length > 1 ? `${t('{name} blok', { name: block.name })}, ` : ''}{t('{n}-qavat', { n: floor })}</h3>
                <span className="muted" style={{ fontSize: 13 }}>{t('{n} ta sotuvda', { n: floorApts.filter((a) => a.status === 'sotuvda').length })} / {floorApts.length}</span>
              </div>
              <FloorPlanSvg t={t} block={block} plan={plan} apartments={floorApts} selected={aptId} isDimmed={isDimmed} onPick={(a) => pickApt(a.id)} />
              <Legend t={t} />
              <ul className="shx-list">
                {floorApts.map((a) => (
                  <li key={a.id}>
                    <button type="button" aria-pressed={a.id === aptId} className={isDimmed(a) ? 'dim' : ''} onClick={() => pickApt(a.id)}>
                      <i style={{ background: STATUS_COLOR[a.status] }} aria-hidden="true" />
                      <span><b>№ {a.number}</b> <span className="muted">{t('{n} xonali', { n: a.rooms })}</span></span>
                      <span className="num">{a.area} m²</span>
                      <span className="num">{a.status === 'sotilgan' ? t(statusText(a.status)) : t('{n} mln', { n: mln(aptPrice(a, complex.price_m2), 1) })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : floor ? (
            <p className="muted">{t("Bu qavat planirovkasi hali kiritilmagan.")}</p>
          ) : (
            <div className="shx-empty">
              <strong>{t('Qavatni tanlang')}</strong>
              <span className="muted">{t("Binoda yoki ro'yxatda qavatni bosing: planirovka, narxlar va bo'sh xonadonlar ochiladi.")}</span>
              <Legend t={t} />
            </div>
          )}
        </div>
      </div>

      {apt && plan && (
        <div id="shx-card">
          <ApartmentCard
            key={apt.id}
            lang={lang}
            complex={complex}
            block={block}
            plan={plan}
            apartment={apt}
            showBlock={blocks.length > 1}
            onWalk={startWalk}
          />
        </div>
      )}

      {cmp.ids.length > 0 && (
        <div className="shx-compare" role="status">
          <span>{t('Taqqoslashda: {n} ta xonadon', { n: cmp.ids.length })}</span>
          <Link className="btn small" href={`${lp(lang, '/taqqoslash')}?x=${cmp.ids.join(',')}`}>{t('Taqqoslash')}</Link>
          <button type="button" className="btn ghost small" onClick={cmp.clear}>{t('Tozalash')}</button>
        </div>
      )}
    </section>
  );
}

function Legend({ t }: { t: (s: string) => string }) {
  return (
    <div className="shx-legend">
      {(['sotuvda', 'bron', 'sotilgan'] as const).map((s) => (
        <span key={s}><i style={{ background: STATUS_COLOR[s] }} aria-hidden="true" />{t(statusText(s))}</span>
      ))}
    </div>
  );
}

function Joystick({ target }: { target: React.MutableRefObject<{ x: number; y: number }> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    const R = r.width / 2;
    let x = (e.clientX - r.left - R) / R;
    let y = (e.clientY - r.top - R) / R;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    target.current = { x, y };
    setKnob({ x: x * R * 0.6, y: y * R * 0.6 });
  };
  const end = () => { target.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); };
  return (
    <div
      ref={base}
      className="shx-joy"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') move(e); }}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden="true"
    >
      <span style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
