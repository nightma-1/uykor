import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Paths that are not language-prefixed; their language comes from the "lang" cookie.
const APP = /^\/(admin|kabinet|kirish)(\/|$)/;
const YEAR = 60 * 60 * 24 * 365;

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // /uz/... is the internal form of Uzbek pages; send visitors to the clean URL.
  if (pathname === '/uz' || pathname.startsWith('/uz/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }

  if (!APP.test(pathname)) {
    const isRu = pathname === '/ru' || pathname.startsWith('/ru/');
    const lang = isRu ? 'ru' : 'uz';
    const headers = new Headers(request.headers);
    headers.set('x-lang', lang);
    let res: NextResponse;
    if (isRu) {
      res = NextResponse.next({ request: { headers } });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = `/uz${pathname === '/' ? '' : pathname}`;
      url.search = search;
      res = NextResponse.rewrite(url, { request: { headers } });
    }
    if (request.cookies.get('lang')?.value !== lang) res.cookies.set('lang', lang, { path: '/', maxAge: YEAR, sameSite: 'lax' });
    return res;
  }

  // Signed-in areas: keep the Supabase session fresh.
  let response = NextResponse.next({ request });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return response;
}

export const config = { matcher: ['/((?!_next/|.*\\..*).*)'] };
