'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePantalla, pedirDatos } from '@/lib/pantalla';
import { todayLocal } from '@/lib/format';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import InviteLink from '@/components/InviteLink';
import AvisoCopiado from '@/components/AvisoCopiado';
import Avatar from '@/components/Avatar';
import Refrescar from '@/components/Refrescar';
import Esqueleto from '@/components/Esqueleto';
import Cabecera from '@/components/Cabecera';
import { useIdioma } from '@/lib/idioma';
import { IcoFlecha } from '@/components/Iconos';

export default function Coach() {
  const r = useRouter();
  const { t } = useIdioma();
  const { sesion, perfil, datos, cargando, error } = usePantalla(async (sb, s) => {
    const hoy = todayLocal();
    const [rAlumnos, rYo, rPlanes] = await Promise.all([
      sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id').eq('coach_id', s.user.id).order('full_name'),
      // El coach también entrena: su propia ficha va la primera.
      sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id').eq('id', s.user.id).maybeSingle(),
      // Quién tiene algo pendiente de aquí en adelante. Una sola consulta para
      // todos en vez de una por alumno.
      sb.from('workouts').select('athlete_id').eq('coach_id', s.user.id).gte('date', hoy).neq('type', 'rest').limit(500),
    ]);
    const alumnos = pedirDatos(rAlumnos) ?? [];
    if (rYo.error) throw new Error(rYo.error.message);
    const planes = new Set((pedirDatos(rPlanes) ?? []).map((w: any) => w.athlete_id));
    const lista = [...(rYo.data && !alumnos.some((a: any) => a.id === rYo.data!.id) ? [rYo.data] : []), ...alumnos];
    return lista.map((a: any) => ({ ...a, con_plan: planes.has(a.id) }));
  });

  // Esta pantalla es solo del entrenador; un atleta que llegue aquí se va a su plan.
  useEffect(() => { if (perfil && perfil.role !== 'coach') r.replace('/athlete'); }, [perfil, r]);

  return (
    <main className="shell">
      <Refrescar />
      <Cabecera titulo={t('alumnos.titulo')} nombre={perfil?.full_name} avatar={perfil?.avatar_url}
        frase={t('alumnos.frase')} />
      {error && <p className="notice mal">{error}</p>}
      {cargando ? <Esqueleto /> : !datos || !sesion ? null : (
        <>
          <InviteLink coachId={sesion.user.id} />
          <AvisoCopiado />
          <div className="athlete-list">
            {datos.length ? datos.map((a: any) => {
              // El coach también entrena, así que su propia ficha va destacada arriba.
              const soyYo = a.id === sesion.user.id;
              return (
                <Link key={a.id} href={`/coach/alumno?id=${a.id}`} className={soyYo ? 'yo' : ''}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <Avatar url={a.avatar_url} name={a.full_name} size={44} />
                    <span style={{ minWidth: 0 }}>
                      <span className="name" style={{ display: 'block' }}>{a.full_name || t('alumnos.sinNombre')}</span>
                      <span className="estado">
                        <i className="punto-estado" />
                        {t(a.con_plan ? 'alumnos.enTrenamiento' : 'alumnos.sinPlan')}
                      </span>
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {a.strava_athlete_id ? <span className="strava">Strava</span> : null}
                    <IcoFlecha />
                  </span>
                </Link>
              );
            }) : <p className="card">{t('alumnos.vacio')}</p>}
          </div>
        </>
      )}
      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
