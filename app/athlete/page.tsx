import Link from 'next/link';
import { requireUser } from '@/lib/guard';
import Plan from '@/components/Plan';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';

export const dynamic = 'force-dynamic';

export default async function AthleteHome() {
  const { sb, user, profile } = await requireUser();
  const desde = new Date(); desde.setDate(desde.getDate() - 21);
  const { data: workouts } = await sb.from('workouts').select('*')
    .eq('athlete_id', user.id).gte('date', desde.toISOString().slice(0, 10)).order('date');
  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar"><div className="brand">MyCoach<span>Runs</span></div><span className="muted">{profile?.full_name}</span></div>
      <h1>Mi plan</h1>
      {!profile?.strava_athlete_id && <p className="notice">Conecta Strava para que tus carreras se sincronicen solas. <Link href="/api/strava/connect" style={{ textDecoration: 'underline' }}>Conectar</Link></p>}
      {!profile?.coach_id && <p className="notice">Todavía no estás vinculado a un entrenador. Pídele su enlace de invitación.</p>}
      <Plan workouts={workouts ?? []} />
      <Footer />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
