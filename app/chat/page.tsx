'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePantalla } from '@/lib/pantalla';
import Chat from '@/components/Chat';
import TabBar from '@/components/TabBar';
import Avatar from '@/components/Avatar';
import Esqueleto from '@/components/Esqueleto';

export default function ChatPage() {
  const atleta = useSearchParams().get('atleta');

  const { sesion, perfil, datos, cargando, error } = usePantalla(async (sb, s) => {
    const esCoach = s.profile?.role === 'coach';

    // El coach sin alumno elegido ve la lista; el atleta va directo a su hilo.
    if (esCoach && !atleta) {
      const [{ data: alumnos }, { data: nuevos }] = await Promise.all([
        sb.from('profiles').select('id,full_name,avatar_url').eq('coach_id', s.user.id).order('full_name'),
        sb.from('messages').select('athlete_id').eq('coach_id', s.user.id).neq('sender_id', s.user.id).is('read_at', null).limit(500),
      ]);
      const sinLeer: Record<string, number> = {};
      for (const m of nuevos ?? []) sinLeer[m.athlete_id] = (sinLeer[m.athlete_id] ?? 0) + 1;
      return { modo: 'lista' as const, alumnos: alumnos ?? [], sinLeer };
    }

    const athleteId = esCoach ? atleta! : s.user.id;
    const coachId = esCoach ? s.user.id : s.profile?.coach_id ?? '';
    if (!coachId) return { modo: 'sin-coach' as const };

    const otroId = esCoach ? athleteId : coachId;
    const { data: otro } = await sb.from('profiles').select('full_name,avatar_url').eq('id', otroId).maybeSingle();
    return { modo: 'hilo' as const, athleteId, coachId, otro, esCoach };
  }, [atleta]);

  const rol = perfil?.role === 'coach' ? 'coach' : 'athlete';

  if (error) return <main className="shell"><h1>Mensajes</h1><p className="notice">{error}</p><TabBar role={rol} /></main>;
  if (cargando || !datos || !sesion) return <main className="shell"><h1>Mensajes</h1><Esqueleto /><TabBar role={rol} /></main>;

  if (datos.modo === 'sin-coach') return (
    <main className="shell">
      <h1>Mensajes</h1>
      <p className="card muted">Todavía no estás vinculado a un entrenador, así que no hay con quién conversar.</p>
      <TabBar role="athlete" />
    </main>
  );

  if (datos.modo === 'lista') return (
    <main className="shell">
      <h1>Mensajes</h1>
      <div className="athlete-list">
        {datos.alumnos.length ? datos.alumnos.map((a: any) => (
          <Link key={a.id} href={`/chat?atleta=${a.id}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar url={a.avatar_url} name={a.full_name} size={40} />
              <span className="name">{a.full_name || 'Sin nombre'}</span>
            </span>
            {datos.sinLeer[a.id] ? <span className="sin-leer">{datos.sinLeer[a.id]}</span> : <span className="muted">›</span>}
          </Link>
        )) : <p className="card muted">Aún no tienes alumnos.</p>}
      </div>
      <TabBar role="coach" />
    </main>
  );

  return (
    <main className="shell">
      {datos.esCoach && <div className="topbar"><Link href="/chat" className="muted">← Mensajes</Link></div>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <Avatar url={datos.otro?.avatar_url} name={datos.otro?.full_name} size={44} />
        <h1 style={{ margin: 0 }}>{datos.otro?.full_name ?? 'Chat'}</h1>
      </div>
      <Chat hilo={{ coachId: datos.coachId, athleteId: datos.athleteId }} yo={sesion.user.id}
            nombreOtro={datos.otro?.full_name ?? 'tu entrenador'} />
      <TabBar role={datos.esCoach ? 'coach' : 'athlete'} />
    </main>
  );
}
