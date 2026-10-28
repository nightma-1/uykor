import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { sb } from './supabase';
import type { FavType } from './types';

type Ctx = {
  has: (t: FavType, id: string) => boolean;
  /** Returns 'login' when nobody is signed in. */
  toggle: (t: FavType, id: string) => Promise<'login' | 'ok' | 'error'>;
  keys: Set<string>;
  refresh: () => Promise<void>;
};

const key = (t: FavType, id: string) => `${t}:${id}`;
const FavCtx = createContext<Ctx>({ has: () => false, toggle: async () => 'login', keys: new Set(), refresh: async () => {} });

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [keys, setKeys] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!uid) { setKeys(new Set()); return; }
    const { data } = await sb.from('favorites').select('item_type, item_id').eq('user_id', uid);
    setKeys(new Set((data || []).map((f) => key(f.item_type as FavType, f.item_id))));
  }, [uid]);

  // Reload saved items whenever the signed-in user changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const toggle: Ctx['toggle'] = async (t, id) => {
    if (!uid) return 'login';
    const k = key(t, id);
    const was = keys.has(k);
    const next = new Set(keys);
    if (was) next.delete(k); else next.add(k);
    setKeys(next);
    const { error } = was
      ? await sb.from('favorites').delete().eq('user_id', uid).eq('item_type', t).eq('item_id', id)
      : await sb.from('favorites').insert({ user_id: uid, item_type: t, item_id: id });
    if (error) { setKeys(keys); return 'error'; }
    return 'ok';
  };

  return <FavCtx.Provider value={{ has: (t, id) => keys.has(key(t, id)), toggle, keys, refresh }}>{children}</FavCtx.Provider>;
}

export const useFavorites = () => useContext(FavCtx);
