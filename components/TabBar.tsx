'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import * as avisos from '@/lib/avisos';
import * as ses from '@/lib/session';
import { IcoAlumnos, IcoPlan, IcoActividades, IcoIniciar, IcoChat, IcoCuenta } from './Iconos';

export default function TabBar({ role }: { role: 'coach' | 'athlete' }) {
  const p = usePathname();
  const sinLeer = useSyncExternalStore(avisos.suscribir, avisos.leer, avisos.leerEnServidor);
  const carrera = useSyncExternalStore(ses.suscribir, ses.leer, ses.leerEnServidor);
  const grabando = carrera.estado === 'running' || carrera.estado === 'paused';

  // La pantalla de carga usa esto para dibujar la barra con la forma correcta.
  useEffect(() => { try { localStorage.setItem('coachrun.role', role); } catch {} }, [role]);

  type Tab = [ruta: string, nombre: string, icono: () => JSX.Element];
  const TODAS: Record<string, Tab> = {
    alumnos: ['/coach', 'Alumnos', IcoAlumnos],
    plan: ['/athlete', 'Plan', IcoPlan],
    actividades: ['/activities', 'Actividades', IcoActividades],
    iniciar: ['/record', 'Iniciar', IcoIniciar],
    chat: ['/chat', 'Chat', IcoChat],
    cuenta: ['/athlete/settings', 'Cuenta', IcoCuenta],
  };
  const tabs: Tab[] = (role === 'coach'
    ? ['alumnos', 'plan', 'actividades', 'iniciar', 'chat', 'cuenta']
    : ['plan', 'actividades', 'iniciar', 'chat', 'cuenta']).map((k) => TODAS[k]);

  return (
    <nav className="tabbar">
      {tabs.map(([h, l, Ico]) => (
        <Link key={h} href={h} className={p === h ? 'on' : ''}>
          <Ico />
          <span>{l}</span>
          <span className="marca" />
          {h === '/chat' && sinLeer.total > 0 && (
            <span className="globo" aria-label={`${sinLeer.total} mensajes sin leer`}>{sinLeer.total > 99 ? '99+' : sinLeer.total}</span>
          )}
          {h === '/record' && grabando && (
            <span className="punto grabando" aria-label={carrera.estado === 'paused' ? 'Carrera en pausa' : 'Grabando'} />
          )}
        </Link>
      ))}
    </nav>
  );
}
