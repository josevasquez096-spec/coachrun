import Link from 'next/link';
import { requireUser } from '@/lib/guard';
import Plan from '@/components/Plan';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function AthleteHome() {
  const { sb, user, profile } = await requireUser();
  const from = new Date(); from.setDate(from.getDate() - 7);
  const { data: workouts } = await sb.from('workouts').select('*').eq('athlete_id', user.id).gte('date', from.toISOString().slice(0, 10)).order('date');
  const { data: acts } = await sb.from('activities').select('*').eq('athlete_id', user.id).gte('started_at', from.toISOString()).order('started_at');
  return (
    <main className="shell">
      <div className="topbar"><div className="brand">Coach<span>Run</span></div><span className="muted">{profile?.full_name}</span></div>
      <h1>Mi plan</h1>
      {!profile?.strava_athlete_id && <p className="notice">Conecta Strava para que tus carreras se sincronicen solas. <Link href="/api/strava/connect" style={{ textDecoration: 'underline' }}>Conectar</Link></p>}
      {!profile?.coach_id && <p className="notice">Todavía no estás vinculado a un entrenador. Pídele su código y pégalo en <Link href="/athlete/settings" style={{ textDecoration: 'underline' }}>Cuenta</Link>.</p>}
      <Plan workouts={workouts ?? []} activities={acts ?? []} />
      <Footer />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
