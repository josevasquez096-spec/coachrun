'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePantalla, pedirDatos } from '@/lib/pantalla';
import { aligerar } from '@/lib/actividad';
import WorkoutForm from '@/components/WorkoutForm';
import PegarEntreno from '@/components/PegarEntreno';
import Plan from '@/components/Plan';
import Activities from '@/components/Activities';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';
import Avatar from '@/components/Avatar';
import Esqueleto from '@/components/Esqueleto';

/**
 * La ficha de un alumno.
 *
 * El identificador va en la dirección como `?id=…` y no como parte de la ruta
 * (`/coach/abc-123`). Con el identificador dentro de la ruta habría que generar
 * una página por alumno al empaquetar el APK, y los alumnos no se conocen al
 * compilar.
 */
export default function Alumno() {
  const r = useRouter();
  const q = useSearchParams();
  const id = q.get('id') ?? '';
  const ver = q.get('ver') === 'actividades' ? 'actividades' : 'plan';

  const { perfil, datos, cargando, error } = usePantalla(async (sb) => {
    // Solo se pide la lista de la pestaña que se mira, y las dos consultas a la vez.
    const [rAlumno, rLista] = await Promise.all([
      sb.from('profiles').select('id,full_name,avatar_url,strava_athlete_id').eq('id', id).maybeSingle(),
      ver === 'plan'
        ? sb.from('workouts').select('*').eq('athlete_id', id).order('date')
        : sb.from('activities').select('*').eq('athlete_id', id).order('started_at', { ascending: false }).limit(60),
    ]);
    if (rAlumno.error) throw new Error(rAlumno.error.message);
    const a = rAlumno.data;
    const lista = pedirDatos(rLista);
    return {
      alumno: a,
      workouts: ver === 'plan' ? (lista ?? []) : [],
      acts: ver === 'plan' ? [] : (lista ?? []).map(aligerar),
    };
  }, [id, ver]);

  useEffect(() => { if (perfil && perfil.role !== 'coach') r.replace('/athlete'); }, [perfil, r]);

  const a = datos?.alumno;
  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar"><Link href="/coach" className="muted">← Alumnos</Link></div>

      {error && <p className="notice">{error}</p>}
      {cargando ? <Esqueleto /> : !datos ? null : (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <Avatar url={a?.avatar_url} name={a?.full_name} size={52} />
            <div>
              <h1 style={{ margin: 0 }}>{a?.full_name}</h1>
              <span className="muted" style={{ fontSize: 13 }}>{a?.strava_athlete_id ? 'Strava conectado' : 'Sin Strava'}</span>
            </div>
          </div>

          <div className="tabs">
            <Link href={`/coach/alumno?id=${id}`} className={ver === 'plan' ? 'on' : ''}>Plan</Link>
            <Link href={`/coach/alumno?id=${id}&ver=actividades`} className={ver === 'actividades' ? 'on' : ''}>Actividades</Link>
          </div>

          {ver === 'plan' ? (
            <>
              <PegarEntreno athleteId={id} nombre={(a?.full_name ?? 'este alumno').split(' ')[0]} />
              <h2>Asignar entrenamiento</h2>
              <WorkoutForm athleteId={id} />
              <h2>Plan</h2>
              <Plan workouts={datos.workouts as any} editable athleteId={id} nombre={a?.full_name ?? 'otro alumno'} />
            </>
          ) : (
            <Activities acts={datos.acts as any} propias={false} />
          )}
        </>
      )}

      <Footer />
      <TabBar role="coach" />
    </main>
  );
}
