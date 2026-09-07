import { supabaseServer } from '@/lib/supabase-server';
import WorkoutForm from '@/components/WorkoutForm';
import Plan from '@/components/Plan';
import TabBar from '@/components/TabBar';
import Link from 'next/link';

export default async function Athlete({ params }: { params: { athleteId: string } }) {
  const sb = supabaseServer();
  const { data: a } = await sb.from('profiles').select('id,full_name').eq('id', params.athleteId).single();
  const { data: workouts } = await sb.from('workouts').select('*').eq('athlete_id', params.athleteId).order('date');
  const { data: acts } = await sb.from('activities').select('*').eq('athlete_id', params.athleteId).order('started_at', { ascending: false }).limit(30);
  return (
    <main className="shell">
      <div className="topbar"><Link href="/coach" className="muted">← Alumnos</Link></div>
      <h1>{a?.full_name}</h1>
      <h2>Asignar entrenamiento</h2>
      <WorkoutForm athleteId={params.athleteId} />
      <h2>Plan y actividades</h2>
      <Plan workouts={workouts ?? []} activities={acts ?? []} editable />
      <TabBar role="coach" />
    </main>
  );
}
