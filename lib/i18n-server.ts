import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isLang, type Lang } from './i18n';

/** Language for pages without a language prefix (kabinet, admin, kirish): remembered in a cookie. */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get('lang')?.value;
  return isLang(v) ? v : 'uz';
}

/** Language of the current public request (set by middleware); used where params are not available. */
export async function requestLang(): Promise<Lang> {
  const h = (await headers()).get('x-lang');
  return isLang(h) ? h : getLang();
}

/** Revalidates a public page in both languages. */
export function revalidatePublic(path: string) {
  revalidatePath(`/uz${path === '/' ? '' : path}`);
  revalidatePath(`/ru${path === '/' ? '' : path}`);
}
