import { redirect } from 'next/navigation';
import { supabaseServer, supabaseAdmin, usuarioActual } from './supabase-server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const cleanCode = (s?: string | null) => {
  const t = String(s ?? '').trim().toLowerCase();
  return UUID.test(t) ? t : null;
};

const CAMPOS = 'id,full_name,role,coach_id,strava_athlete_id,avatar_url,max_hr,resting_hr';

/**
 * El perfil de un usuario, creándolo si falta y aplicando el código de
 * entrenador pendiente (del enlace de invitación o del registro).
 *
 * Va aparte de `requireUser()` porque lo necesitan dos sitios: las páginas del
 * servidor, y la ruta `/api/perfil` que usa la app de Android, donde no se
 * puede redirigir a ninguna parte: hay que devolver JSON.
 */
export async function perfilDe(user: { id: string; email?: string | null; user_metadata?: any }) {
  const sb = supabaseServer();
  const admin = supabaseAdmin();
  const meta: any = user.user_metadata ?? {};

  let { data: profile } = await sb.from('profiles').select(CAMPOS).eq('id', user.id).maybeSingle();

  if (!profile) {
    await admin.from('profiles').upsert({
      id: user.id,
      full_name: meta.full_name ?? user.email?.split('@')[0] ?? null,
      role: 'athlete',
    }, { onConflict: 'id' });
    const again = await admin.from('profiles').select(CAMPOS).eq('id', user.id).maybeSingle();
    profile = again.data;
  }

  // El perfil puede haberlo creado la base de datos antes de que llegara el código
  // del enlace: si sigue sin entrenador y hay código pendiente, lo aplicamos ahora.
  const pendiente = cleanCode(meta.coach_code);
  if (profile && !profile.coach_id && pendiente && pendiente !== user.id) {
    const { data: coach } = await admin.from('profiles').select('id').eq('id', pendiente).eq('role', 'coach').maybeSingle();
    if (coach) {
      await admin.from('profiles').update({ coach_id: coach.id }).eq('id', user.id);
      profile = { ...profile, coach_id: coach.id };
    }
  }

  return profile;
}

/**
 * Exige sesión y devuelve usuario + perfil. Para las páginas que se dibujan en
 * el servidor. Si no hay sesión, manda a la pantalla de entrar.
 */
export async function requireUser() {
  const user = await usuarioActual();
  if (!user) redirect('/?entrar=1');
  const profile = await perfilDe(user);
  return { sb: supabaseServer(), user, profile };
}
