import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin, usuarioActual } from '@/lib/supabase-server';
import { notifyUser } from '@/lib/push';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
// La misma lista que `workout_type` en Postgres. Si se amplia alli, aqui
// tambien: lo que no este en la lista se pega como rodaje suave.
const TIPOS = ['easy', 'long', 'tempo', 'intervals', 'race', 'rest', 'strength', 'walk', 'trail'];
const MUSCULOS_OK = /^[a-z]{3,12}$/;

/**
 * Pone un entrenamiento en el plan de **uno o varios** alumnos.
 *
 * Va por aquí y no directo desde el navegador porque hay que comprobar que
 * cada alumno sea **de este coach**: las reglas de la base de datos solo miran
 * que el entrenamiento lleve tu firma, no a quién se lo asignas.
 *
 * Acepta `athleteId` (uno) o `athleteIds` (varios). Lo usan el pegado de un
 * entrenamiento copiado y el formulario de asignar, que antes insertaba desde
 * el navegador saltándose esa comprobación.
 */
export async function POST(req: Request) {
  const user = await usuarioActual();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });

  const { athleteId, athleteIds, date, workout } = await req.json();
  const ids: string[] = [...new Set(
    (Array.isArray(athleteIds) ? athleteIds : [athleteId]).filter((x) => typeof x === 'string' && x),
  )].slice(0, 50);
  if (!ids.length || !FECHA.test(String(date ?? ''))) return NextResponse.json({ error: 'Faltan el alumno o la fecha' }, { status: 400 });
  if (!workout?.title) return NextResponse.json({ error: 'No hay nada que pegar' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: alumnos } = await db.from('profiles').select('id,coach_id,full_name').in('id', ids);
  // Se exige que estén TODOS y que todos sean de este coach. Si uno no lo es
  // no se asigna a ninguno: mejor que se quede a medias sin avisar.
  const mios = (alumnos ?? []).filter((a) => a.coach_id === user.id || a.id === user.id);
  if (mios.length !== ids.length) return NextResponse.json({ error: 'Alguno de esos alumnos no es tuyo' }, { status: 403 });

  const fases = Array.isArray(workout.phases) && workout.phases.length ? workout.phases : null;
  if (fases && JSON.stringify(fases).length > 60000) return NextResponse.json({ error: 'El entrenamiento es demasiado largo' }, { status: 400 });

  const base = {
    coach_id: user.id,
    date,
    type: TIPOS.includes(workout.type) ? workout.type : 'easy',
    title: String(workout.title).slice(0, 200),
    description: workout.description ? String(workout.description).slice(0, 4000) : null,
    target_pace: workout.target_pace ? String(workout.target_pace).slice(0, 20) : null,
    target_distance_km: Number.isFinite(workout.target_distance_km) ? workout.target_distance_km : null,
    target_duration_min: Number.isFinite(workout.target_duration_min) ? workout.target_duration_min : null,
    phases: fases,
    // Los músculos solo viajan en un entrenamiento de fuerza, y se filtran:
    // lo que llega del navegador no se mete tal cual en la base de datos.
    muscles: workout.type === 'strength' && Array.isArray(workout.muscles)
      ? workout.muscles.filter((m: unknown) => typeof m === 'string' && MUSCULOS_OK.test(m)).slice(0, 20)
      : null,
  };

  const { error } = await db.from('workouts').insert(ids.map((id) => ({ ...base, athlete_id: id })));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cuando = new Date(date + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  // Los avisos no bloquean la respuesta: si el push falla, el entrenamiento ya
  // está puesto y el alumno lo verá al abrir la app.
  for (const id of ids) notifyUser(id, 'Entrenamiento nuevo', `${workout.title} — ${cuando}`).catch(() => {});
  return NextResponse.json({ ok: true, cuantos: ids.length, alumno: mios[0]?.full_name });
}
