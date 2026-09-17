'use client';
import { usePantalla, papel } from '@/lib/pantalla';
import Recorder from '@/components/Recorder';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';
import Esqueleto from '@/components/Esqueleto';

export default function RecordPage() {
  const { sesion, perfil, datos, cargando, error } = usePantalla(async (sb, s) => {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const desde = new Date(); desde.setDate(desde.getDate() - 2);
    const hasta = new Date(); hasta.setDate(hasta.getDate() + 2);
    const { data } = await sb.from('workouts')
      .select('id,date,title,target_distance_km,target_pace,phases,completed,type')
      .eq('athlete_id', s.user.id).gte('date', iso(desde)).lte('date', iso(hasta)).neq('type', 'rest').order('date');
    return data ?? [];
  });

  return (
    <main className="shell">
      <Refrescar />
      <h1>Iniciar</h1>
      {error && <p className="notice">{error}</p>}
      {cargando || !datos ? <Esqueleto /> : (
        <Recorder pendientes={datos as any} hasStrava={!!perfil?.strava_athlete_id} perfil={perfil as any} />
      )}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
