'use client';
import { usePantalla, papel } from '@/lib/pantalla';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';
import Settings from '@/components/Settings';
import Esqueleto from '@/components/Esqueleto';
import Cabecera from '@/components/Cabecera';
import { useIdioma } from '@/lib/idioma';

export default function SettingsPage() {
  const { t } = useIdioma();
  const { sesion, perfil, cargando, error } = usePantalla();
  return (
    <main className="shell">
      <Refrescar />
      <Cabecera titulo={t('cuenta.titulo')} nombre={perfil?.full_name} avatar={perfil?.avatar_url}
        frase={t('cuenta.frase')} />
      {error && <p className="notice mal">{error}</p>}
      {cargando ? <Esqueleto /> : perfil ? <Settings me={perfil as any} email={sesion?.user.email ?? undefined} /> : null}
      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
