import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { notifyUser } from '@/lib/push';

/** Comprueba que quien pide forma parte del hilo. */
async function permitido(userId: string, coachId: string, athleteId: string) {
  if (userId !== coachId && userId !== athleteId) return false;
  const { data } = await supabaseAdmin().from('profiles').select('coach_id').eq('id', athleteId).maybeSingle();
  return data?.coach_id === coachId;
}

export async function GET(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });
  const u = new URL(req.url);
  const coachId = u.searchParams.get('coachId') ?? '';
  const athleteId = u.searchParams.get('athleteId') ?? '';
  if (!(await permitido(user.id, coachId, athleteId))) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const db = supabaseAdmin();
  const { data } = await db.from('messages').select('id,sender_id,body,created_at')
    .eq('coach_id', coachId).eq('athlete_id', athleteId).order('created_at').limit(300);
  await db.from('messages').update({ read_at: new Date().toISOString() })
    .eq('coach_id', coachId).eq('athlete_id', athleteId).neq('sender_id', user.id).is('read_at', null);
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión caducada' }, { status: 401 });
  const { coachId, athleteId, body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  if (!(await permitido(user.id, coachId, athleteId))) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const db = supabaseAdmin();
  const { error } = await db.from('messages').insert({ coach_id: coachId, athlete_id: athleteId, sender_id: user.id, body: body.trim().slice(0, 2000) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const destino = user.id === coachId ? athleteId : coachId;
  const { data: quien } = await db.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  notifyUser(destino, `Mensaje de ${quien?.full_name ?? 'tu equipo'}`, body.trim().slice(0, 90), '/chat').catch(() => {});
  return NextResponse.json({ ok: true });
}
