import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { exchangeCode } from '@/lib/strava';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code'); const userId = url.searchParams.get('state');
  if (!code || !userId) return NextResponse.redirect(new URL('/athlete?strava=error', url.origin));
  const t = await exchangeCode(code);
  await supabaseAdmin().from('profiles').update({
    strava_athlete_id: t.athlete.id, strava_access_token: t.access_token, strava_refresh_token: t.refresh_token, strava_expires_at: t.expires_at,
  }).eq('id', userId);
  return NextResponse.redirect(new URL('/athlete?strava=ok', url.origin));
}
