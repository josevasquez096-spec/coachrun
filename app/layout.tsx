import type { Metadata, Viewport } from 'next';
import './globals.css';
import SW from '@/components/SW';

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
    <html lang="es"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;800&display=swap" rel="stylesheet" /></head><body>{children}<SW /></body></html>
  );
}
