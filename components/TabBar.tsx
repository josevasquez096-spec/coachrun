'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TabBar({ role }: { role: 'coach' | 'athlete' }) {
  const p = usePathname();
  const tabs: [string, string][] = role === 'coach'
    ? [['/coach', 'Alumnos'], ['/athlete', 'Mi plan'], ['/activities', 'Actividades'], ['/record', 'Grabar'], ['/athlete/settings', 'Cuenta']]
    : [['/athlete', 'Mi plan'], ['/activities', 'Actividades'], ['/record', 'Grabar'], ['/athlete/settings', 'Cuenta']];
  return (
    <nav className="tabbar">
      {tabs.map(([h, l]) => <Link key={h} href={h} className={p === h ? 'on' : ''}>{l}</Link>)}
    </nav>
  );
}
