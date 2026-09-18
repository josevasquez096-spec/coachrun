import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin, usuarioActual } from '@/lib/supabase-server';
import { notifyUser } from '@/lib/push';

/** Solo el coach del atleta puede avisarle. */
export async function POST(req: Request) {
  const user = await usuarioActual();
  if (!user) return NextResponse.json({}, { status: 401 });
  const { athleteId, title, body } = await req.json();

  const db = supabaseAdmin();
  const { data: a } = await db.from('profiles').select('coach_id').eq('id', athleteId).maybeSingle();
  if (!a || a.coach_id !== user.id) return NextResponse.json({ error: 'no es tu alumno' }, { status: 403 });

  const res = await notifyUser(athleteId, title, body);
  return NextResponse.json(res);
}
