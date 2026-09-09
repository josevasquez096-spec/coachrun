import TabBarFantasma from '@/components/TabBarFantasma';

/**
 * Lo que se ve mientras el servidor prepara la pantalla siguiente.
 * Sin esto el teléfono se quedaba mostrando la pestaña anterior sin dar señales
 * de vida, y el cambio parecía lento aunque tardara lo mismo.
 */
export default function Cargando() {
  return (
    <main className="shell">
      <div className="topbar"><div className="brand">MyCoach<span>Runs</span></div></div>
      <div className="hueso" style={{ height: 30, width: '45%', marginBottom: 16 }} />
      <div className="hueso" style={{ height: 88, marginBottom: 10 }} />
      <div className="hueso" style={{ height: 88, marginBottom: 10 }} />
      <div className="hueso" style={{ height: 88, opacity: .6 }} />
      <TabBarFantasma />
    </main>
  );
}
