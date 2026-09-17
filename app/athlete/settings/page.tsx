'use client';
import { usePantalla, papel } from '@/lib/pantalla';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';
import Settings from '@/components/Settings';
import Esqueleto from '@/components/Esqueleto';

export default function SettingsPage() {
  const { sesion, perfil, cargando, error } = usePantalla();
  return (
    <main className="shell">
      <Refrescar />
      <h1>Cuenta</h1>
      {error && <p className="notice">{error}</p>}
      {cargando || !perfil ? <Esqueleto /> : <Settings me={perfil as any} email={sesion?.user.email ?? undefined} />}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
