'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { CallHours } from '@/lib/contact';
import type { Lang } from '@/lib/i18n';
import PhoneReveal from './PhoneReveal';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

export default function MasterContact({ lang, id, hours }: { lang: Lang; id: string; hours: CallHours }) {
  useEffect(() => {
    sb.rpc('master_view', { mid: id }).then(() => {}, () => {});
  }, [id]);
  return <PhoneReveal lang={lang} kind="usta" id={id} hours={hours} />;
}
