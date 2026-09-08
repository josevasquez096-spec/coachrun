import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { cleanCode } from '@/lib/guard';

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tu sesión caducó. Entra de nuevo.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  const update: Record<string, unknown> = {};
  if (typeof body.full_name === 'string') update.full_name = body.full_name.trim();

  const raw = String(body.coach_code ?? '').trim();
  if (raw) {
    const code = cleanCode(raw);
    if (!code) return NextResponse.json({ error: 'Ese código no tiene el formato correcto. Copia el enlace completo que te pasó tu entrenador.' }, { status: 400 });
    if (code === user.id) return NextResponse.json({ error: 'Ese es tu propio código.' }, { status: 400 });
    const { data: coach } = await admin.from('profiles').select('id').eq('id', code).eq('role', 'coach').maybeSingle();
    if (!coach) return NextResponse.json({ error: 'No encontramos a ningún entrenador con ese código.' }, { status: 404 });
    update.coach_id = coach.id;
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const { error } = await admin.from('profiles').update(update).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
