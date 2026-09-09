import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { notifyUser } from '@/lib/push';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS = ['easy', 'long', 'tempo', 'intervals', 'race', 'rest', 'strength'];

/**
 * Copia un entrenamiento al plan de un alumno.
 *
 * Va por aquí y no directo desde el navegador porque hay que comprobar que el
 * alumno sea **de este coach**: las reglas de la base de datos solo miran que el
 * entrenamiento lleve tu firma, no a quién se lo asignas.
 */
export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });

  const { athleteId, date, workout } = await req.json();
  if (!athleteId || !FECHA.test(String(date ?? ''))) return NextResponse.json({ error: 'Faltan el alumno o la fecha' }, { status: 400 });
  if (!workout?.title) return NextResponse.json({ error: 'No hay nada que pegar' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: alumno } = await db.from('profiles').select('id,coach_id,full_name').eq('id', athleteId).maybeSingle();
  if (!alumno || alumno.coach_id !== user.id) return NextResponse.json({ error: 'Ese alumno no es tuyo' }, { status: 403 });

  const fases = Array.isArray(workout.phases) && workout.phases.length ? workout.phases : null;
  if (fases && JSON.stringify(fases).length > 60000) return NextResponse.json({ error: 'El entrenamiento es demasiado largo' }, { status: 400 });

  const { error } = await db.from('workouts').insert({
    coach_id: user.id,
    athlete_id: athleteId,
    date,
    type: TIPOS.includes(workout.type) ? workout.type : 'easy',
    title: String(workout.title).slice(0, 200),
    description: workout.description ? String(workout.description).slice(0, 4000) : null,
    target_pace: workout.target_pace ? String(workout.target_pace).slice(0, 20) : null,
    target_distance_km: Number.isFinite(workout.target_distance_km) ? workout.target_distance_km : null,
    target_duration_min: Number.isFinite(workout.target_duration_min) ? workout.target_duration_min : null,
    phases: fases,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cuando = new Date(date + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  notifyUser(athleteId, 'Entrenamiento nuevo', `${workout.title} — ${cuando}`).catch(() => {});
  return NextResponse.json({ ok: true, alumno: alumno.full_name });
}
