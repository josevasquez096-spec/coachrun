import { requireUser } from '@/lib/guard';
import Recorder from '@/components/Recorder';
import TabBar from '@/components/TabBar';

export const dynamic = 'force-dynamic';

export default async function RecordPage() {
  const { sb, user, profile } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todays } = await sb.from('workouts').select('id,title,target_distance_km,target_pace').eq('athlete_id', user.id).eq('date', today).neq('type', 'rest').limit(1).maybeSingle();
  return (
    <main className="shell">
      <h1>Grabar</h1>
      <Recorder todays={todays} hasStrava={!!profile?.strava_athlete_id} />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
