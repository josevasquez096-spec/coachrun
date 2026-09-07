'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function TabBar({ role }: { role: 'coach' | 'athlete' }) {
  const p = usePathname();
  const tabs = role === 'coach'
    ? [['/coach', 'Alumnos'], ['/record', 'Grabar'], ['/athlete', 'Mi plan']]
    : [['/athlete', 'Mi plan'], ['/record', 'Grabar'], ['/athlete/settings', 'Cuenta']];
  return <nav className="tabbar">{tabs.map(([h, l]) => <Link key={h} href={h} className={p === h ? 'on' : ''}>{l}</Link>)}</nav>;
}
