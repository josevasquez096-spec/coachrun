import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import SW from '@/components/SW';
import PuenteNativo from '@/components/PuenteNativo';

// La fuente se sirve desde el propio dominio. Antes venía con un <link> a Google
// Fonts que bloqueaba el primer dibujado de cada pantalla.
const archivo = Archivo({ subsets: ['latin'], weight: ['400', '700', '800'], display: 'swap', variable: '--fuente' });

export const metadata: Metadata = {
  title: 'MyCoachRuns',
  description: 'Entrenamientos de running asignados por tu entrenador',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MyCoachRuns' },
  icons: { apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#0B0D0B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={archivo.variable}><body>{children}<SW /><PuenteNativo /></body></html>
  );
}
