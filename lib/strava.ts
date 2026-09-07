import { supabaseAdmin } from './supabase-server';
export { toGpx, haversine, type Point } from './geo';
import { type Point } from './geo';

const TOKEN_URL = 'https://www.strava.com/oauth/token';

export function authorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,activity:write',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${p}`;
}

export async function exchangeCode(code: string) {
  const r = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: 'authorization_code' }),
  });
  if (!r.ok) throw new Error('Strava token exchange failed');
  return r.json();
}

/** Devuelve un access token válido para el usuario, refrescándolo si caducó. */
export async function accessTokenFor(userId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: p } = await db.from('profiles').select('strava_access_token,strava_refresh_token,strava_expires_at').eq('id', userId).single();
  if (!p?.strava_refresh_token) throw new Error('Usuario sin Strava');
  if (p.strava_expires_at && p.strava_expires_at * 1000 > Date.now() + 60_000) return p.strava_access_token!;
  const r = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: p.strava_refresh_token }),
  });
  const t = await r.json();
  await db.from('profiles').update({ strava_access_token: t.access_token, strava_refresh_token: t.refresh_token, strava_expires_at: t.expires_at }).eq('id', userId);
  return t.access_token;
}

export async function fetchActivity(userId: string, stravaId: number) {
  const token = await accessTokenFor(userId);
  const r = await fetch(`https://www.strava.com/api/v3/activities/${stravaId}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

/** Sube un GPX a Strava (igual que hace Garmin Connect). */
export async function uploadGpx(userId: string, gpx: string, name: string) {
  const token = await accessTokenFor(userId);
  const fd = new FormData();
  fd.append('file', new Blob([gpx], { type: 'application/gpx+xml' }), 'run.gpx');
  fd.append('data_type', 'gpx'); fd.append('name', name); fd.append('sport_type', 'Run');
  const r = await fetch('https://www.strava.com/api/v3/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  return r.json();
}

