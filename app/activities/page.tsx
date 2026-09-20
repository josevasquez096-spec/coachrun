'use client';
import { usePantalla, papel, pedirDatos } from '@/lib/pantalla';
import { aligerar } from '@/lib/actividad';
import Activities from '@/components/Activities';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';
import Esqueleto from '@/components/Esqueleto';
import Cabecera from '@/components/Cabecera';
import { useIdioma } from '@/lib/idioma';

export default function ActivitiesPage() {
  const { t } = useIdioma();
  const { sesion, datos, cargando, error } = usePantalla(async (sb, s) => {
    const data = pedirDatos(await sb.from('activities').select('*')
      .eq('athlete_id', s.user.id).order('started_at', { ascending: false }).limit(120));
    const acts = data ?? [];
    return { lista: acts.map(aligerar), total: acts.reduce((t, a: any) => t + (a.distance_m ?? 0), 0) / 1000 };
  });

  return (
    <main className="shell">
      <Refrescar />
      <Cabecera titulo={t('actividades.titulo')} dato={datos ? `${datos.total.toFixed(0)} km` : undefined}
        frase={t('actividades.frase')} />
      {error && <p className="notice mal">{error}</p>}
      {cargando ? <Esqueleto /> : datos ? <Activities acts={datos.lista} /> : null}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
