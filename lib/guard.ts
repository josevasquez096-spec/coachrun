import { redirect } from 'next/navigation';
import { supabaseServer, supabaseAdmin } from './supabase-server';

/**
 * Exige sesión y devuelve usuario + perfil.
 * Si el perfil no existe todavía (registro recién hecho), lo crea en vez de rebotar,
 * que es lo que provocaba bucles de redirección.
 */
export async function requireUser() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  // El parámetro corta cualquier bucle: la home no vuelve a redirigir cuando lo ve.
  if (!user) redirect('/?entrar=1');

  let { data: profile } = await sb.from('profiles')
    .select('id,full_name,role,coach_id,strava_athlete_id').eq('id', user.id).maybeSingle();

  if (!profile) {
    const admin = supabaseAdmin();
    const meta: any = user.user_metadata ?? {};
    await admin.from('profiles').upsert({
      id: user.id,
      full_name: meta.full_name ?? user.email?.split('@')[0] ?? null,
      role: 'athlete',
    }, { onConflict: 'id' });
    if (meta.coach_code) {
      const { data: coach } = await admin.from('profiles').select('id').eq('id', meta.coach_code).eq('role', 'coach').maybeSingle();
      if (coach) await admin.from('profiles').update({ coach_id: coach.id }).eq('id', user.id);
    }
    const again = await admin.from('profiles').select('id,full_name,role,coach_id,strava_athlete_id').eq('id', user.id).maybeSingle();
    profile = again.data;
  }

  return { sb, user, profile };
}
