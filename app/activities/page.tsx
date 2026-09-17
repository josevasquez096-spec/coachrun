'use client';
import { usePantalla, papel } from '@/lib/pantalla';
import { aligerar } from '@/lib/actividad';
import Activities from '@/components/Activities';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';
import Esqueleto from '@/components/Esqueleto';

export default function ActivitiesPage() {
  const { sesion, datos, cargando, error } = usePantalla(async (sb, s) => {
    const { data } = await sb.from('activities').select('*')
      .eq('athlete_id', s.user.id).order('started_at', { ascending: false }).limit(120);
    const acts = data ?? [];
    return { lista: acts.map(aligerar), total: acts.reduce((t, a: any) => t + (a.distance_m ?? 0), 0) / 1000 };
  });

  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar">
        <div className="brand">MyCoach<span>Runs</span></div>
        <span className="muted">{datos ? `${datos.total.toFixed(0)} km en total` : ''}</span>
      </div>
      <h1>Actividades</h1>
      {error && <p className="notice">{error}</p>}
      {cargando || !datos ? <Esqueleto /> : <Activities acts={datos.lista} />}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
