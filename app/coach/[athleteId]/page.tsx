import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/guard';
import { aligerar } from '@/lib/actividad';
import WorkoutForm from '@/components/WorkoutForm';
import PegarEntreno from '@/components/PegarEntreno';
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
  const ver = searchParams.ver === 'actividades' ? 'actividades' : 'plan';

  // Las dos consultas van a la vez, y solo se pide la lista de la pestaña que se
  // está mirando: antes se traía el plan y las actividades siempre, aunque no se vieran.
  const [{ data: a }, listas] = await Promise.all([
    sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id').eq('id', params.athleteId).single(),
    ver === 'plan'
      ? sb.from('workouts').select('*').eq('athlete_id', params.athleteId).order('date')
      : sb.from('activities').select('*').eq('athlete_id', params.athleteId).order('started_at', { ascending: false }).limit(60),
  ]);
  const workouts = ver === 'plan' ? (listas.data ?? []) : [];
  const acts = ver === 'plan' ? [] : (listas.data ?? []).map(aligerar);

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
          <PegarEntreno athleteId={params.athleteId} nombre={(a?.full_name ?? 'este alumno').split(' ')[0]} />
          <h2>Asignar entrenamiento</h2>
          <WorkoutForm athleteId={params.athleteId} />
          <h2>Plan</h2>
          <Plan workouts={workouts} editable athleteId={params.athleteId} nombre={a?.full_name ?? 'otro alumno'} />
        </>
      ) : (
        <Activities acts={acts} propias={false} />
      )}

      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
