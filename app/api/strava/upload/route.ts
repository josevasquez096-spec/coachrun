import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { toGpx, uploadGpx } from '@/lib/strava';
import { distanciaTotal, type Point } from '@/lib/geo';

export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });

  const { points, name, workoutId, movingTime, subirStrava, rpe, notas, avgHr, distanceM } =
    (await req.json()) as {
      points: Point[]; name: string; workoutId?: string; movingTime: number;
      subirStrava?: boolean; rpe?: number | null; notas?: string | null; avgHr?: number | null;
      distanceM?: number;
    };
  if (!points?.length) return NextResponse.json({ error: 'No se registró ningún punto GPS' }, { status: 400 });

  // La distancia buena es la que midió el filtro durante la carrera. Sumar la
  // traza aquí volvería a acumular el temblor del GPS y marcaría de más; solo
  // sirve de respaldo si por lo que sea no llega el número.
  const dist = typeof distanceM === 'number' && distanceM > 0 ? distanceM : distanciaTotal(points);
  const db = supabaseAdmin();
  let stravaId: number | null = null, uploadStatus = 'no enviado';

  if (subirStrava) {
    const { data: p } = await db.from('profiles').select('strava_refresh_token').eq('id', user.id).single();
    if (p?.strava_refresh_token) {
      try {
        const up = await uploadGpx(user.id, toGpx(points, name), name);
        uploadStatus = up.status ?? 'enviado';
        stravaId = up.activity_id ?? null;
      } catch { uploadStatus = 'no se pudo subir'; }
    } else uploadStatus = 'sin Strava conectado';
  }

  const { error } = await db.from('activities').insert({
    athlete_id: user.id, workout_id: workoutId ?? null, source: 'app', strava_id: stravaId, name,
    started_at: new Date(points[0].t).toISOString(),
    distance_m: Math.round(dist), moving_time_s: Math.round(movingTime),
    avg_hr: avgHr ?? null, rpe: rpe ?? null, notes: notas ?? null,
    raw: { n: points.length, uploadStatus },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (workoutId) await db.from('workouts').update({ completed: true }).eq('id', workoutId).eq('athlete_id', user.id);
  return NextResponse.json({ ok: true, uploadStatus, distance_m: dist });
}
