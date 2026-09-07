import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authorizeUrl } from '@/lib/strava';

export async function GET(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.redirect(authorizeUrl(user.id));
}
