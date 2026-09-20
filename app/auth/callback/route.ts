import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import { cleanCode } from '@/lib/guard';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) {
    const sb = supabaseServer();
    const { data } = await sb.auth.exchangeCodeForSession(code);
    const user = data.user;
    if (user) {
      const admin = supabaseAdmin();
      const meta: any = user.user_metadata ?? {};
      const { data: existing } = await admin.from('profiles').select('id,coach_id').eq('id', user.id).maybeSingle();
      if (!existing) {
        await admin.from('profiles').insert({ id: user.id, full_name: meta.full_name ?? user.email?.split('@')[0] ?? null, role: 'athlete' });
      }
      const code = cleanCode(meta.coach_code);
      if (code && code !== user.id && !existing?.coach_id) {
        const { data: coach } = await admin.from('profiles').select('id').eq('id', code).eq('role', 'coach').maybeSingle();
        if (coach) await admin.from('profiles').update({ coach_id: coach.id }).eq('id', user.id);
      }
    }
  }
  // `next` permite volver a una pantalla concreta: lo usa el correo de
  // recuperar contraseña, que manda derecho a Cuenta para ponerse una nueva.
  // Solo se aceptan rutas de dentro, para que un enlace manipulado no pueda
  // mandar a nadie a otro sitio.
  const next = url.searchParams.get('next') ?? '/';
  const destino = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return NextResponse.redirect(new URL(destino, url.origin));
}
