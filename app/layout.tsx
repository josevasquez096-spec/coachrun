import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import SW from '@/components/SW';

// La fuente se sirve desde el propio dominio. Antes venía con un <link> a Google
// Fonts que bloqueaba el primer dibujado de cada pantalla.
const archivo = Archivo({ subsets: ['latin'], weight: ['400', '700', '800'], display: 'swap', variable: '--fuente' });

export const metadata: Metadata = {
  title: 'CoachRun',
  description: 'Entrenamientos de running asignados por tu entrenador',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'CoachRun' },
  icons: { apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#1B2233', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={archivo.variable}><body>{children}<SW /></body></html>
  );
}
