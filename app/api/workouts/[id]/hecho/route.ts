import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin, usuarioActual } from '@/lib/supabase-server';

/** El atleta marca su propio entrenamiento; el coach también puede. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await usuarioActual();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });
  const { completed } = await req.json();
  const db = supabaseAdmin();
  const { data: w } = await db.from('workouts').select('athlete_id,coach_id,type,title,date,muscles,target_duration_min').eq('id', params.id).maybeSingle();
  if (!w) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  if (w.athlete_id !== user.id && w.coach_id !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  const { error } = await db.from('workouts').update({ completed: !!completed }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // La fuerza no se graba con GPS, así que al marcarla hecha se crea aquí su
  // actividad: es lo que le da al atleta su ficha y la imagen con los músculos
  // para compartir. Al desmarcar se borra, para no dejar duplicados si se
  // marca y desmarca varias veces.
  if (w.type === 'strength') {
    if (completed) {
      const { data: ya } = await db.from('activities').select('id').eq('workout_id', params.id).maybeSingle();
      if (!ya) {
        await db.from('activities').insert({
          athlete_id: w.athlete_id, workout_id: params.id, source: 'app', type: 'strength',
          name: w.title, started_at: new Date(w.date + 'T12:00:00').toISOString(),
          moving_time_s: w.target_duration_min ? w.target_duration_min * 60 : null,
          muscles: w.muscles ?? null, raw: {},
        });
      }
    } else {
      await db.from('activities').delete().eq('workout_id', params.id).eq('source', 'app').eq('type', 'strength');
    }
  }
  return NextResponse.json({ ok: true });
}
