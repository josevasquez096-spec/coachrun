'use client';
import { usePantalla, papel } from '@/lib/pantalla';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';
import Settings from '@/components/Settings';
import Esqueleto from '@/components/Esqueleto';
import Cabecera from '@/components/Cabecera';

export default function SettingsPage() {
  const { sesion, perfil, cargando, error } = usePantalla();
  return (
    <main className="shell">
      <Refrescar />
      <Cabecera titulo="Cuenta" nombre={perfil?.full_name} avatar={perfil?.avatar_url}
        frase="Tu perfil, tus zonas de pulso y la conexión con Strava." />
      {error && <p className="notice mal">{error}</p>}
      {cargando ? <Esqueleto /> : perfil ? <Settings me={perfil as any} email={sesion?.user.email ?? undefined} /> : null}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
