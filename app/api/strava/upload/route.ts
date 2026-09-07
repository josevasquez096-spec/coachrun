import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { toGpx, uploadGpx, haversine, type Point } from '@/lib/strava';

// Recibe los puntos GPS grabados en la app, los guarda y los sube a Strava como GPX
export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({}, { status: 401 });
  const { points, name, workoutId, movingTime } = (await req.json()) as { points: Point[]; name: string; workoutId?: string; movingTime: number };
  if (!points?.length) return NextResponse.json({ error: 'sin puntos' }, { status: 400 });
  let dist = 0; for (let i = 1; i < points.length; i++) dist += haversine(points[i - 1], points[i]);
  const db = supabaseAdmin();
  const { data: p } = await db.from('profiles').select('strava_refresh_token').eq('id', user.id).single();
  let stravaId: number | null = null, uploadStatus = 'sin Strava';
  if (p?.strava_refresh_token) {
    try { const up = await uploadGpx(user.id, toGpx(points, name), name); uploadStatus = up.status ?? 'enviado'; stravaId = up.activity_id ?? null; }
    catch (e) { uploadStatus = 'error al subir'; console.error(e); }
  }
  await db.from('activities').insert({
    athlete_id: user.id, workout_id: workoutId ?? null, source: 'app', strava_id: stravaId, name,
    started_at: new Date(points[0].t).toISOString(), distance_m: Math.round(dist), moving_time_s: Math.round(movingTime),
    polyline: null, raw: { n: points.length, uploadStatus },
  });
  if (workoutId) await db.from('workouts').update({ completed: true }).eq('id', workoutId).eq('athlete_id', user.id);
  return NextResponse.json({ ok: true, uploadStatus, distance_m: dist });
}
