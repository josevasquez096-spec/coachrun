import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) {
    const sb = supabaseServer();
    const { data } = await sb.auth.exchangeCodeForSession(code);
    // Vincula al coach si el alumno pegó su código (el código es el id del coach)
    const coachCode = data.user?.user_metadata?.coach_code;
    if (data.user && coachCode) {
      const admin = supabaseAdmin();
      const { data: coach } = await admin.from('profiles').select('id').eq('id', coachCode).eq('role', 'coach').maybeSingle();
      if (coach) await admin.from('profiles').update({ coach_id: coach.id }).eq('id', data.user.id);
    }
  }
  return NextResponse.redirect(new URL('/', url.origin));
}
