import { NextResponse } from 'next/server';
import { supabaseServer, usuarioActual } from '@/lib/supabase-server';
import { authorizeUrl } from '@/lib/strava';

export async function GET(req: Request) {
  const user = await usuarioActual();
  if (!user) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.redirect(authorizeUrl(user.id));
}
