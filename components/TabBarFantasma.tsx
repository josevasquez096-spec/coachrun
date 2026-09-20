'use client';
import { useEffect, useState } from 'react';
import { useIdioma } from '@/lib/idioma';

/**
 * Copia sin vida de la barra de pestañas, solo para la pantalla de carga.
 * Recuerda el papel (coach o atleta) de la última vez para que la barra no
 * cambie de forma mientras se carga la pantalla siguiente.
 */
export default function TabBarFantasma() {
  const { t } = useIdioma();
  const [role, setRole] = useState<'coach' | 'athlete'>('athlete');
  useEffect(() => {
    try { if (localStorage.getItem('coachrun.role') === 'coach') setRole('coach'); } catch {}
  }, []);
  const tabs = (role === 'coach'
    ? ['tab.alumnos', 'tab.plan', 'tab.actividades', 'tab.iniciar', 'tab.chat', 'tab.cuenta']
    : ['tab.plan', 'tab.actividades', 'tab.iniciar', 'tab.chat', 'tab.cuenta'] as const).map((k) => t(k as any));
  return <nav className="tabbar">{tabs.map((l) => <span key={l} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2)', padding: '6px 2px' }}>{l}</span>)}</nav>;
}
