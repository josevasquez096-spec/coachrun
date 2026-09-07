import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const sb = supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({}, { status: 401 });
  const { full_name, coach_code } = await req.json();
  const admin = supabaseAdmin();
  const update: Record<string, unknown> = { full_name };
  if (coach_code) {
    const { data: coach } = await admin.from('profiles').select('id').eq('id', coach_code).eq('role', 'coach').maybeSingle();
    if (!coach) return NextResponse.json({ error: 'coach not found' }, { status: 404 });
    update.coach_id = coach.id;
  }
  await admin.from('profiles').update(update).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
