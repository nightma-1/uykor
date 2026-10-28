'use server';

import { sessionClient } from '@/lib/supabase-server';

export type ReviewState = { ok?: boolean; login?: boolean; error?: string };

export async function addReview(_prev: ReviewState, f: FormData): Promise<ReviewState> {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { login: true };
  const masterId = String(f.get('master_id') ?? '');
  const rating = Number(f.get('rating'));
  const body = String(f.get('body') ?? '').trim();
  if (!(rating >= 1 && rating <= 5)) return { error: 'Baho tanlang (1 dan 5 gacha).' };
  if (body.length < 10) return { error: "Sharhni batafsilroq yozing: kamida 10 ta belgi." };
  const { data: prof } = await sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const authorName = (prof?.full_name || (user.email?.endsWith('@telegram.uykor.uz') ? user.user_metadata?.full_name : user.email?.split('@')[0]) || 'Mijoz').slice(0, 60);
  const { error } = await sb.from('master_reviews').insert({ master_id: masterId, author_id: user.id, author_name: authorName, rating, body: body.slice(0, 1500) });
  if (error) {
    if (error.code === '23505') return { error: 'Siz bu ustaga allaqachon sharh yozgansiz.' };
    return { error: error.message.includes('zingizga') ? "O'zingizga sharh yozib bo'lmaydi." : "Sharh yuborilmadi. Qayta urinib ko'ring." };
  }
  return { ok: true };
}
