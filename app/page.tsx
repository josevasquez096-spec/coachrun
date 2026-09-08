import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/guard';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import InviteLink from '@/components/InviteLink';

export const dynamic = 'force-dynamic';

export default async function Coach() {
  const { sb, user, profile } = await requireUser();
  if (profile?.role !== 'coach') redirect('/athlete');
  const { data: athletes } = await sb.from('profiles').select('id,full_name,strava_athlete_id').eq('coach_id', user.id).order('full_name');
  return (
    <main className="shell">
      <div className="topbar"><div className="brand">Coach<span>Run</span></div><span className="muted">{profile?.full_name}</span></div>
      <h1>Alumnos</h1>
      <InviteLink coachId={user.id} />
      <div className="athlete-list">
        {athletes?.length ? athletes.map((a) => (
          <Link key={a.id} href={`/coach/${a.id}`}>
            <span className="name">{a.full_name || 'Sin nombre'}</span>
            <span className="strava">{a.strava_athlete_id ? 'Strava conectado' : ''}</span>
          </Link>
        )) : <p className="card">Aún no tienes alumnos. Comparte tu enlace de invitación.</p>}
      </div>
      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
