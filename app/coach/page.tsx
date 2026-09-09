import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/guard';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import InviteLink from '@/components/InviteLink';
import AvisoCopiado from '@/components/AvisoCopiado';
import Avatar from '@/components/Avatar';
import Refrescar from '@/components/Refrescar';

export const dynamic = 'force-dynamic';

export default async function Coach() {
  const { sb, user, profile } = await requireUser();
  if (profile?.role !== 'coach') redirect('/athlete');
  const { data: athletes } = await sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id').eq('coach_id', user.id).order('full_name');
  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar"><div className="brand">MyCoach<span>Runs</span></div><span className="muted">{profile?.full_name}</span></div>
      <h1>Alumnos</h1>
      <InviteLink coachId={user.id} />
      <AvisoCopiado />
      <div className="athlete-list">
        {athletes?.length ? athletes.map((a) => (
          <Link key={a.id} href={`/coach/${a.id}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar url={a.avatar_url} name={a.full_name} size={40} />
              <span className="name">{a.full_name || 'Sin nombre'}</span>
            </span>
            <span className="strava">{a.strava_athlete_id ? 'Strava' : ''}</span>
          </Link>
        )) : <p className="card">Aún no tienes alumnos. Comparte tu enlace de invitación.</p>}
      </div>
      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
