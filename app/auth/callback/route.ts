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
  return NextResponse.redirect(new URL('/', url.origin));
}
