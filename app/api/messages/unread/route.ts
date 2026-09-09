import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Cuántos mensajes sin leer tengo y de quién.
 * Sirve igual para el coach (cuenta por alumno) que para el atleta (su coach),
 * porque agrupa por "el otro lado del hilo".
 */
export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ total: 0, por: {} });

  // RLS ya limita a los hilos en los que participo; aquí solo pido los que no he leído.
  const { data } = await sb.from('messages').select('coach_id,athlete_id')
    .or(`coach_id.eq.${user.id},athlete_id.eq.${user.id}`)
    .neq('sender_id', user.id).is('read_at', null).limit(500);

  const por: Record<string, number> = {};
  for (const m of data ?? []) {
    const otro = m.coach_id === user.id ? m.athlete_id : m.coach_id;
    por[otro] = (por[otro] ?? 0) + 1;
  }
  return NextResponse.json({ total: (data ?? []).length, por });
}
