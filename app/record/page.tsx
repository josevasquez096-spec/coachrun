import { supabaseServer } from '@/lib/supabase-server';
import Recorder from '@/components/Recorder';
import TabBar from '@/components/TabBar';

export default async function RecordPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data: me } = await sb.from('profiles').select('role,strava_athlete_id').eq('id', user!.id).single();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todays } = await sb.from('workouts').select('id,title,target_distance_km,target_pace').eq('athlete_id', user!.id).eq('date', today).neq('type', 'rest').limit(1).maybeSingle();
  return (
    <main className="shell">
      <h1>Grabar</h1>
      <Recorder todays={todays} hasStrava={!!me?.strava_athlete_id} />
      <TabBar role={(me?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
