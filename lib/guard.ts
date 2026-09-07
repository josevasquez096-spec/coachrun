import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase-server';

/** Exige sesión. Devuelve el usuario y su perfil, o manda al login. */
export async function requireUser() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const { data: profile } = await sb.from('profiles')
    .select('id,full_name,role,coach_id,strava_athlete_id').eq('id', user.id).single();
  return { sb, user, profile };
}
