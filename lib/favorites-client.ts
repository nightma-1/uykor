'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export type FavType = 'majmua' | 'elon' | 'usta';

export const sbBrowser = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// One shared copy of the signed-in user's favorites for every heart on the page.
type State = { userId: string | null; keys: Set<string> };
let state: State | null = null;
let loading: Promise<State> | null = null;
const listeners = new Set<() => void>();
const key = (t: FavType, id: string) => `${t}:${id}`;

function load(): Promise<State> {
  if (state) return Promise.resolve(state);
  if (!loading) {
    loading = (async () => {
      const { data: { user } } = await sbBrowser.auth.getUser();
      if (!user) return (state = { userId: null, keys: new Set() });
      const { data } = await sbBrowser.from('favorites').select('item_type, item_id').eq('user_id', user.id);
      return (state = { userId: user.id, keys: new Set((data || []).map((f) => key(f.item_type as FavType, f.item_id))) });
    })().catch(() => (state = { userId: null, keys: new Set() }));
  }
  return loading;
}

export function useFavorite(type: FavType, id: string) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    load().then(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const on = !!state?.keys.has(key(type, id));

  async function toggle(): Promise<'login' | 'ok' | 'error'> {
    const s = await load();
    if (!s.userId) return 'login';
    const k = key(type, id);
    const was = s.keys.has(k);
    if (was) s.keys.delete(k); else s.keys.add(k);
    listeners.forEach((l) => l());
    const { error } = was
      ? await sbBrowser.from('favorites').delete().eq('user_id', s.userId).eq('item_type', type).eq('item_id', id)
      : await sbBrowser.from('favorites').insert({ user_id: s.userId, item_type: type, item_id: id });
    if (error) {
      if (was) s.keys.add(k); else s.keys.delete(k);
      listeners.forEach((l) => l());
      return 'error';
    }
    return 'ok';
  }

  return { on, ready: state !== null, toggle };
}
