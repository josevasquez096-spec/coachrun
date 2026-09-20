'use client';
import Link from 'next/link';
import { usePantalla, papel, pedirDatos } from '@/lib/pantalla';
import Plan from '@/components/Plan';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';
import Esqueleto from '@/components/Esqueleto';
import Cabecera from '@/components/Cabecera';
import { useIdioma } from '@/lib/idioma';

export default function AthleteHome() {
  const { t } = useIdioma();
  const { sesion, perfil, datos, cargando, error } = usePantalla(async (sb, s) => {
    const desde = new Date(); desde.setDate(desde.getDate() - 21);
    const data = pedirDatos(await sb.from('workouts').select('*')
      .eq('athlete_id', s.user.id).gte('date', desde.toISOString().slice(0, 10)).order('date'));
    return data ?? [];
  });

  return (
    <main className="shell">
      <Refrescar />
      <Cabecera titulo={t('plan.titulo')} nombre={perfil?.full_name} avatar={perfil?.avatar_url}
        frase={t('plan.frase')} />
      {error && <p className="notice mal">{error}</p>}
      {cargando ? <Esqueleto /> : !datos ? null : (
        <>
          {!perfil?.strava_athlete_id && <p className="notice">{t('plan.conectaStrava')} <Link href="/api/strava/connect" style={{ textDecoration: 'underline' }}>{t('plan.conectar')}</Link></p>}
          {!perfil?.coach_id && <p className="notice">{t('plan.sinCoach')}</p>}
          <Plan workouts={datos} />
        </>
      )}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
