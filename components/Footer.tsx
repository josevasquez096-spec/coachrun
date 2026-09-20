import { APOYO, CORREO, INSTAGRAM, LOGO, STRAVA_AUTOR } from '@/lib/marca';

/**
 * El pie que va en todas las pantallas.
 *
 * El logo se sirve desde `public/`, no como texto, porque el de verdad lleva
 * el corredor y el lema.
 *
 * Se usa un `<img>` normal y no `next/image` a propósito: hay dos
 * compilaciones (la de Vercel y la del APK) y el optimizador de imágenes se
 * comporta distinto en cada una. Para un logo fijo que se enseña pequeño no
 * aporta nada y sí puede dar sorpresas.
 */
export default function Footer() {
  return (
    <footer style={{ marginTop: 32, paddingTop: 18, borderTop: '1px solid var(--line)', textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="MyCoachRuns · Entrena, mejora, avanza" width={900} height={430} loading="lazy"
        style={{ width: 168, height: 'auto', margin: '0 auto 10px', display: 'block' }} />

      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', margin: '0 0 12px', fontSize: 13, fontWeight: 700, flexWrap: 'wrap' }}>
        <a href={STRAVA_AUTOR} target="_blank" rel="noopener noreferrer" style={{ color: '#FC4C02' }}>Strava</a>
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-2)' }}>Instagram</a>
        <a href={`mailto:${CORREO}`} style={{ color: 'var(--ink-2)' }}>Escríbenos</a>
      </div>

      <a href={APOYO} target="_blank" rel="noopener noreferrer"
        className="btn ghost" style={{ padding: '7px 18px', fontSize: 13 }}>Apoyar el proyecto</a>

      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>By JVasquez</p>
    </footer>
  );
}
