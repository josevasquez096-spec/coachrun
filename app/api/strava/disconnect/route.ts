import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { accessTokenFor } from '@/lib/strava';

export async function POST() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({}, { status: 401 });
  // Avisamos a Strava para que revoque el permiso desde su lado
  try {
    const token = await accessTokenFor(user.id);
    await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch { /* si el token ya no vale, seguimos y limpiamos igual */ }
  await supabaseAdmin().from('profiles').update({
    strava_athlete_id: null, strava_access_token: null, strava_refresh_token: null, strava_expires_at: null,
  }).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
