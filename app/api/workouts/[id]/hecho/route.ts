import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';

/** El atleta marca su propio entrenamiento; el coach también puede. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });
  const { completed } = await req.json();
  const db = supabaseAdmin();
  const { data: w } = await db.from('workouts').select('athlete_id,coach_id').eq('id', params.id).maybeSingle();
  if (!w) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  if (w.athlete_id !== user.id && w.coach_id !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  const { error } = await db.from('workouts').update({ completed: !!completed }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
