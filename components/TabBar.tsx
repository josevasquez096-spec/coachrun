'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import * as avisos from '@/lib/avisos';
import * as ses from '@/lib/session';
import { useIdioma } from '@/lib/idioma';
import { IcoAlumnos, IcoPlan, IcoActividades, IcoIniciar, IcoChat, IcoCuenta } from './Iconos';

export default function TabBar({ role }: { role: 'coach' | 'athlete' }) {
  const p = usePathname();
  const { t } = useIdioma();
  const sinLeer = useSyncExternalStore(avisos.suscribir, avisos.leer, avisos.leerEnServidor);
  const carrera = useSyncExternalStore(ses.suscribir, ses.leer, ses.leerEnServidor);
  const grabando = carrera.estado === 'running' || carrera.estado === 'paused';

  // La pantalla de carga usa esto para dibujar la barra con la forma correcta.
  useEffect(() => { try { localStorage.setItem('coachrun.role', role); } catch {} }, [role]);

  type Tab = [ruta: string, nombre: string, icono: () => JSX.Element];
  const TODAS: Record<string, Tab> = {
    alumnos: ['/coach', t('tab.alumnos'), IcoAlumnos],
    plan: ['/athlete', t('tab.plan'), IcoPlan],
    actividades: ['/activities', t('tab.actividades'), IcoActividades],
    iniciar: ['/record', t('tab.iniciar'), IcoIniciar],
    chat: ['/chat', t('tab.chat'), IcoChat],
    cuenta: ['/athlete/settings', t('tab.cuenta'), IcoCuenta],
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
            <span className="punto grabando" aria-label={carrera.estado === 'paused' ? t('grabar.enPausa') : t('grabar.enMarcha')} />
          )}
        </Link>
      ))}
    </nav>
  );
}
