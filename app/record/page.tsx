import { requireUser } from '@/lib/guard';
import Recorder from '@/components/Recorder';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function RecordPage() {
  const { sb, user, profile } = await requireUser();
  const from = new Date(); from.setDate(from.getDate() - 2);
  const to = new Date(); to.setDate(to.getDate() + 2);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const { data: pendientes } = await sb.from('workouts')
    .select('id,date,title,target_distance_km,target_pace,phases,completed,type')
    .eq('athlete_id', user.id).gte('date', iso(from)).lte('date', iso(to)).neq('type', 'rest').order('date');

  return (
    <main className="shell">
      <Refrescar />
      <h1>Iniciar</h1>
      <Recorder pendientes={pendientes ?? []} hasStrava={!!profile?.strava_athlete_id} perfil={profile as any} />
      <Footer />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
