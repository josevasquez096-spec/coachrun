'use client';
import { usePantalla, papel, pedirDatos } from '@/lib/pantalla';
import Recorder from '@/components/Recorder';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';
import Esqueleto from '@/components/Esqueleto';
import Cabecera from '@/components/Cabecera';
import { useIdioma } from '@/lib/idioma';

export default function RecordPage() {
  const { t } = useIdioma();
  const { sesion, perfil, datos, cargando, error } = usePantalla(async (sb, s) => {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const desde = new Date(); desde.setDate(desde.getDate() - 2);
    const hasta = new Date(); hasta.setDate(hasta.getDate() + 2);
    const data = pedirDatos(await sb.from('workouts')
      .select('id,date,title,target_distance_km,target_pace,phases,completed,type')
      .eq('athlete_id', s.user.id).gte('date', iso(desde)).lte('date', iso(hasta)).not('type', 'in', '(rest,strength)').order('date'));
    return data ?? [];
  // `cache` los guarda en el teléfono: en la calle sin cobertura hay que poder
  // salir a hacer el entrenamiento del día igual.
  }, [], { cache: 'entrenos-cerca' });

  return (
    <main className="shell">
      <Refrescar />
      <Cabecera titulo={t('iniciar.titulo')} frase={t('iniciar.frase')} />
      {error && <p className="notice mal">{error}</p>}
      {/* El Recorder se monta pase lo que pase con la red: el motor de
          grabación es local y una carrera en curso tiene que seguir viéndose
          aunque se pierda la cobertura a mitad. Sin lista de entrenamientos se
          puede grabar libre. */}
      {cargando ? <Esqueleto /> : (
        <Recorder pendientes={(datos ?? []) as any} hasStrava={!!perfil?.strava_athlete_id} perfil={perfil as any} />
      )}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
