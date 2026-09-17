'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePantalla } from '@/lib/pantalla';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import InviteLink from '@/components/InviteLink';
import AvisoCopiado from '@/components/AvisoCopiado';
import Avatar from '@/components/Avatar';
import Refrescar from '@/components/Refrescar';
import Esqueleto from '@/components/Esqueleto';

export default function Coach() {
  const r = useRouter();
  const { sesion, perfil, datos, cargando, error } = usePantalla(async (sb, s) => {
    const { data } = await sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id')
      .eq('coach_id', s.user.id).order('full_name');
    return data ?? [];
  });

  // Esta pantalla es solo del entrenador; un atleta que llegue aquí se va a su plan.
  useEffect(() => { if (perfil && perfil.role !== 'coach') r.replace('/athlete'); }, [perfil, r]);

  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar"><div className="brand">MyCoach<span>Runs</span></div><span className="muted">{perfil?.full_name}</span></div>
      <h1>Alumnos</h1>
      {error && <p className="notice">{error}</p>}
      {cargando || !datos || !sesion ? <Esqueleto /> : (
        <>
          <InviteLink coachId={sesion.user.id} />
          <AvisoCopiado />
          <div className="athlete-list">
            {datos.length ? datos.map((a: any) => (
              <Link key={a.id} href={`/coach/alumno?id=${a.id}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar url={a.avatar_url} name={a.full_name} size={40} />
                  <span className="name">{a.full_name || 'Sin nombre'}</span>
                </span>
                <span className="strava">{a.strava_athlete_id ? 'Strava' : ''}</span>
              </Link>
            )) : <p className="card">Aún no tienes alumnos. Comparte tu enlace de invitación.</p>}
          </div>
        </>
      )}
      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
