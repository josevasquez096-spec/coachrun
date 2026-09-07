import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  // Sin configuración no hay sesión que comprobar: deja pasar en vez de tumbar la app.
  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return res;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all: { name: string; value: string; options?: any }[]) => {
          all.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          all.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const path = req.nextUrl.pathname;
    const isProtected = path.startsWith('/coach') || path.startsWith('/athlete') || path.startsWith('/record');

    if (!user && isProtected) return NextResponse.redirect(new URL('/', req.url));
    if (user && path === '/') {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      return NextResponse.redirect(new URL(p?.role === 'coach' ? '/coach' : '/athlete', req.url));
    }
    return res;
  } catch (e) {
    console.error('Middleware:', e);
    return res;
  }
}

export const config = { matcher: ['/', '/coach/:path*', '/athlete/:path*', '/record/:path*'] };
