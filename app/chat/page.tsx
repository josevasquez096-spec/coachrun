import Link from 'next/link';
import { requireUser } from '@/lib/guard';
import Chat from '@/components/Chat';
import TabBar from '@/components/TabBar';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ searchParams }: { searchParams: { atleta?: string } }) {
  const { sb, user, profile } = await requireUser();
  const esCoach = profile?.role === 'coach';

  // El coach elige con quién habla; el atleta habla siempre con su entrenador.
  if (esCoach && !searchParams.atleta) {
    const { data: alumnos } = await sb.from('profiles').select('id,full_name,avatar_url').eq('coach_id', user.id).order('full_name');
    return (
      <main className="shell">
        <h1>Mensajes</h1>
        <div className="athlete-list">
          {alumnos?.length ? alumnos.map((a) => (
            <Link key={a.id} href={`/chat?atleta=${a.id}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar url={a.avatar_url} name={a.full_name} size={40} />
                <span className="name">{a.full_name || 'Sin nombre'}</span>
              </span>
              <span className="muted">›</span>
            </Link>
          )) : <p className="card muted">Aún no tienes alumnos.</p>}
        </div>
        <TabBar role="coach" />
      </main>
    );
  }

  const athleteId = esCoach ? searchParams.atleta! : user.id;
  const coachId = esCoach ? user.id : profile?.coach_id ?? '';
  if (!coachId) {
    return (
      <main className="shell">
        <h1>Mensajes</h1>
        <p className="card muted">Todavía no estás vinculado a un entrenador, así que no hay con quién conversar.</p>
        <TabBar role="athlete" />
      </main>
    );
  }

  const otroId = esCoach ? athleteId : coachId;
  const { data: otro } = await sb.from('profiles').select('full_name,avatar_url').eq('id', otroId).maybeSingle();

  return (
    <main className="shell">
      {esCoach && <div className="topbar"><Link href="/chat" className="muted">← Mensajes</Link></div>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <Avatar url={otro?.avatar_url} name={otro?.full_name} size={44} />
        <h1 style={{ margin: 0 }}>{otro?.full_name ?? 'Chat'}</h1>
      </div>
      <Chat hilo={{ coachId, athleteId }} yo={user.id} nombreOtro={otro?.full_name ?? 'tu entrenador'} />
      <TabBar role={esCoach ? 'coach' : 'athlete'} />
    </main>
  );
}
