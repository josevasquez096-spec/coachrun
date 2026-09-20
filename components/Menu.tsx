'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOGO, INSTAGRAM, STRAVA_COACH, CORREO, APOYO } from '@/lib/marca';

/**
 * El menú que se desliza desde la derecha.
 *
 * Existe porque la barra de abajo se quedó sin sitio: seis pestañas ya van
 * apretadas, y aquí caben las cosas que no se tocan cada día (Servicios,
 * contacto, redes) sin quitarle espacio a las que sí.
 *
 * Se cierra solo al cambiar de pantalla; si no, al tocar un enlace la pantalla
 * cambiaba por detrás y el menú se quedaba abierto encima.
 */
export default function Menu() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  useEffect(() => { setAbierto(false); }, [ruta]);

  // Con el menú abierto no se puede rodar la página de detrás.
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  return (
    <>
      <button className="abre-menu" aria-label="Abrir menú" onClick={() => setAbierto(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>

      {abierto && <div className="velo" onClick={() => setAbierto(false)} />}

      <aside className={`cajon ${abierto ? 'on' : ''}`} aria-hidden={!abierto}>
        <div className="cajon-cab">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="MyCoachRuns" style={{ height: 40, width: 'auto' }} />
          <button aria-label="Cerrar" onClick={() => setAbierto(false)} className="cierra">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <nav className="cajon-lista">
          <Link href="/servicios" className={ruta === '/servicios' ? 'on' : ''}>
            <b>Servicios</b><small>Pacing en carrera y entrenamiento 1 a 1</small>
          </Link>
          <Link href="/athlete/settings"><b>Cuenta</b><small>Tu perfil, pulso y Strava</small></Link>
          <a href={`mailto:${CORREO}`}><b>Escríbenos</b><small>{CORREO}</small></a>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><b>Instagram</b><small>@mycoachruns</small></a>
          <a href={STRAVA_COACH} target="_blank" rel="noopener noreferrer"><b>Strava</b><small>Sigue al entrenador</small></a>
          <a href={APOYO} target="_blank" rel="noopener noreferrer"><b>Apoyar el proyecto</b><small>Invítame un café</small></a>
        </nav>

        <p className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 'auto', paddingTop: 16 }}>
          MyCoachRuns · By JVasquez
        </p>
      </aside>
    </>
  );
}
