import { redirect } from 'next/navigation';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase-server';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { coach?: string; entrar?: string } }) {
  const { data: { user } } = await supabaseServer().auth.getUser();

  // Solo redirigimos si hay sesión Y perfil confirmado. Si venimos rebotados
  // desde una página protegida (entrar=1), mostramos el login sin redirigir:
  // así nunca se forma un bucle.
  if (user && !searchParams.entrar) {
    const { data: p } = await supabaseServer().from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (p) redirect(p.role === 'coach' ? '/coach' : '/athlete');
  }

  let coachName: string | null = null;
  if (searchParams.coach) {
    const { data } = await supabaseAdmin().from('profiles').select('full_name').eq('id', searchParams.coach).eq('role', 'coach').maybeSingle();
    coachName = data?.full_name ?? null;
  }
  return <LoginForm inviteCoachId={coachName ? searchParams.coach! : undefined} inviteCoachName={coachName ?? undefined} sesionRota={!!(user && searchParams.entrar)} />;
}
