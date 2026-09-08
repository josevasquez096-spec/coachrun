import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/guard';
import WorkoutForm from '@/components/WorkoutForm';
import Plan from '@/components/Plan';
import Activities from '@/components/Activities';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function Athlete({ params, searchParams }: { params: { athleteId: string }; searchParams: { ver?: string } }) {
  const { sb, profile } = await requireUser();
  if (profile?.role !== 'coach') redirect('/athlete');
  const { data: a } = await sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id').eq('id', params.athleteId).single();
  const { data: workouts } = await sb.from('workouts').select('*').eq('athlete_id', params.athleteId).order('date');
  const { data: acts } = await sb.from('activities').select('*').eq('athlete_id', params.athleteId).order('started_at', { ascending: false }).limit(60);
  const ver = searchParams.ver === 'actividades' ? 'actividades' : 'plan';

  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar"><Link href="/coach" className="muted">← Alumnos</Link></div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <Avatar url={a?.avatar_url} name={a?.full_name} size={52} />
        <div>
          <h1 style={{ margin: 0 }}>{a?.full_name}</h1>
          <span className="muted" style={{ fontSize: 13 }}>{a?.strava_athlete_id ? 'Strava conectado' : 'Sin Strava'}</span>
        </div>
      </div>

      <div className="tabs">
        <Link href={`/coach/${params.athleteId}`} className={ver === 'plan' ? 'on' : ''}>Plan</Link>
        <Link href={`/coach/${params.athleteId}?ver=actividades`} className={ver === 'actividades' ? 'on' : ''}>Actividades</Link>
      </div>

      {ver === 'plan' ? (
        <>
          <h2>Asignar entrenamiento</h2>
          <WorkoutForm athleteId={params.athleteId} />
          <h2>Plan</h2>
          <Plan workouts={workouts ?? []} editable athleteId={params.athleteId} />
        </>
      ) : (
        <Activities acts={acts ?? []} propias={false} />
      )}

      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
