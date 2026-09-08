import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { notifyUser } from '@/lib/push';

async function owner(id: string) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return { error: 'No autorizado', status: 401 as const };
  const db = supabaseAdmin();
  const { data: w } = await db.from('workouts').select('id,coach_id,athlete_id,title').eq('id', id).maybeSingle();
  if (!w) return { error: 'No existe', status: 404 as const };
  if (w.coach_id !== user.id) return { error: 'No es tu entrenamiento', status: 403 as const };
  return { db, w };
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const o = await owner(params.id);
  if ('error' in o) return NextResponse.json({ error: o.error }, { status: o.status });
  // Las carreras ya registradas se conservan: solo dejan de apuntar a este entrenamiento.
  await o.db.from('activities').update({ workout_id: null }).eq('workout_id', params.id);
  const { error } = await o.db.from('workouts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  notifyUser(o.w.athlete_id, 'Entrenamiento cancelado', o.w.title).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const o = await owner(params.id);
  if ('error' in o) return NextResponse.json({ error: o.error }, { status: o.status });
  const patch = await req.json();
  const { error } = await o.db.from('workouts').update(patch).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  notifyUser(o.w.athlete_id, 'Entrenamiento actualizado', patch.title ?? o.w.title).catch(() => {});
  return NextResponse.json({ ok: true });
}
