import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { fetchActivity } from '@/lib/strava';

// Verificación de suscripción (Strava llama con hub.challenge)
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get('hub.verify_token') !== process.env.STRAVA_VERIFY_TOKEN) return NextResponse.json({}, { status: 403 });
  return NextResponse.json({ 'hub.challenge': u.searchParams.get('hub.challenge') });
}

// Evento: el alumno grabó/subió algo en Strava (o Garmin lo sincronizó) → lo importamos
export async function POST(req: Request) {
  const ev = await req.json();
  if (ev.object_type !== 'activity' || (ev.aspect_type !== 'create' && ev.aspect_type !== 'update')) return NextResponse.json({ ok: true });
  const db = supabaseAdmin();
  const { data: p } = await db.from('profiles').select('id').eq('strava_athlete_id', ev.owner_id).maybeSingle();
  if (!p) return NextResponse.json({ ok: true });
  try {
    const a = await fetchActivity(p.id, ev.object_id);
    if (a.type !== 'Run' && a.sport_type !== 'Run' && a.sport_type !== 'TrailRun') return NextResponse.json({ ok: true });
    const day = a.start_date_local.slice(0, 10);
    const { data: w } = await db.from('workouts').select('id').eq('athlete_id', p.id).eq('date', day).neq('type', 'rest').limit(1).maybeSingle();
    await db.from('activities').upsert({
      athlete_id: p.id, workout_id: w?.id ?? null, source: 'strava', strava_id: a.id, name: a.name,
      started_at: a.start_date, distance_m: a.distance, moving_time_s: a.moving_time, avg_hr: a.average_heartrate ?? null,
      polyline: a.map?.summary_polyline ?? null, raw: a,
    }, { onConflict: 'strava_id' });
    if (w) await db.from('workouts').update({ completed: true }).eq('id', w.id);
  } catch (e) { console.error(e); }
  return NextResponse.json({ ok: true });
}
