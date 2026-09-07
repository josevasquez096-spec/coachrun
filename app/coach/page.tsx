import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import TabBar from '@/components/TabBar';

export default async function Coach() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data: me } = await sb.from('profiles').select('full_name,role').eq('id', user!.id).single();
  const { data: athletes } = await sb.from('profiles').select('id,full_name,strava_athlete_id').eq('coach_id', user!.id).order('full_name');
  return (
    <main className="shell">
      <div className="topbar"><div className="brand">Coach<span>Run</span></div><span className="muted">{me?.full_name}</span></div>
      <h1>Alumnos</h1>
      <p className="muted">Tu código de entrenador: <code style={{ userSelect: 'all' }}>{user!.id}</code></p>
      <div className="athlete-list">
        {athletes?.length ? athletes.map((a) => (
          <Link key={a.id} href={`/coach/${a.id}`}>
            <span className="name">{a.full_name || 'Sin nombre'}</span>
            <span className="strava">{a.strava_athlete_id ? 'Strava conectado' : ''}</span>
          </Link>
        )) : <p className="card">Aún no tienes alumnos. Pásales tu código para que lo peguen al registrarse.</p>}
      </div>
      <TabBar role="coach" />
    </main>
  );
}
