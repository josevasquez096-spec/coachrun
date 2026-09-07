import { supabaseServer } from '@/lib/supabase-server';
import TabBar from '@/components/TabBar';
import Settings from '@/components/Settings';

export default async function SettingsPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data: me } = await sb.from('profiles').select('full_name,role,strava_athlete_id,coach_id').eq('id', user!.id).single();
  return (
    <main className="shell">
      <h1>Cuenta</h1>
      <Settings me={me!} />
      <TabBar role={(me?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
