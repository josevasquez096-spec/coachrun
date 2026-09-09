'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import * as avisos from '@/lib/avisos';
import * as ses from '@/lib/session';

export default function TabBar({ role }: { role: 'coach' | 'athlete' }) {
  const p = usePathname();
  const sinLeer = useSyncExternalStore(avisos.suscribir, avisos.leer, avisos.leerEnServidor);
  const carrera = useSyncExternalStore(ses.suscribir, ses.leer, ses.leerEnServidor);
  const grabando = carrera.estado === 'running' || carrera.estado === 'paused';

  // La pantalla de carga usa esto para dibujar la barra con la forma correcta.
  useEffect(() => { try { localStorage.setItem('coachrun.role', role); } catch {} }, [role]);

  const tabs: [string, string][] = role === 'coach'
    ? [['/coach', 'Alumnos'], ['/athlete', 'Plan'], ['/activities', 'Actividades'], ['/record', 'Iniciar'], ['/chat', 'Chat'], ['/athlete/settings', 'Cuenta']]
    : [['/athlete', 'Plan'], ['/activities', 'Actividades'], ['/record', 'Iniciar'], ['/chat', 'Chat'], ['/athlete/settings', 'Cuenta']];

  return (
    <nav className="tabbar">
      {tabs.map(([h, l]) => (
        <Link key={h} href={h} className={p === h ? 'on' : ''}>
          {l}
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
