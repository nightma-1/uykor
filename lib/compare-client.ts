'use client';

import { useEffect, useState } from 'react';

// Taqqoslash ro'yxati: brauzerda saqlanadi, 4 tagacha xonadon.
const KEY = 'uykor-taqqoslash';
const MAX = 4;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX))); } catch { /* brauzer saqlashga ruxsat bermasa ham ishlaydi */ }
  mem = ids.slice(0, MAX);
  listeners.forEach((l) => l());
}

let mem: string[] | null = null;

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (mem === null) mem = read();
    setIds(mem);
    const fn = () => setIds([...(mem || [])]);
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) { mem = read(); fn(); } };
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage); };
  }, []);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      const cur = mem ?? read();
      if (cur.includes(id)) write(cur.filter((x) => x !== id));
      else write([...cur.slice(-(MAX - 1)), id]);
    },
    remove: (id: string) => write((mem ?? read()).filter((x) => x !== id)),
    clear: () => write([]),
    max: MAX,
  };
}
