'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Tirar hacia abajo para actualizar, más un botón por si el gesto no funciona. */
export default function Refrescar() {
  const r = useRouter();
  const [tiro, setTiro] = useState(0);
  const [cargando, setCargando] = useState(false);
  const inicio = useRef<number | null>(null);
  const UMBRAL = 70;

  async function refrescar() {
    setCargando(true);
    r.refresh();
    setTimeout(() => { setCargando(false); setTiro(0); }, 900);
  }

  // Los oyentes se registran una sola vez. Antes se quitaban y se volvían a poner
  // en cada milímetro del gesto, lo que hacía el desplazamiento pesado en el móvil.
  const tiroRef = useRef(0); const cargandoRef = useRef(false);
  tiroRef.current = tiro; cargandoRef.current = cargando;

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      inicio.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (inicio.current === null || cargandoRef.current) return;
      const d = e.touches[0].clientY - inicio.current;
      if (d > 0 && window.scrollY <= 0) setTiro(Math.min(d * 0.5, 90));
    };
    const onEnd = () => {
      if (tiroRef.current >= UMBRAL) refrescar(); else setTiro(0);
      inicio.current = null;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  return (
    <>
      <div style={{
        height: cargando ? 44 : tiro, overflow: 'hidden', display: 'grid', placeItems: 'center',
        transition: tiro === 0 || cargando ? 'height .25s' : 'none', color: 'var(--ink-2)', fontSize: 13, fontWeight: 700,
      }}>
        {cargando ? 'Actualizando…' : tiro >= UMBRAL ? 'Suelta para actualizar' : tiro > 0 ? 'Tira para actualizar' : ''}
      </div>
      <button onClick={refrescar} aria-label="Actualizar" title="Actualizar"
        style={{
          position: 'fixed', right: 14, bottom: 78, zIndex: 40, width: 44, height: 44, borderRadius: '50%',
          border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,.10)', fontSize: 18,
        }}>
        <span style={{ display: 'inline-block', transition: 'transform .6s', transform: cargando ? 'rotate(360deg)' : 'none' }}>⟳</span>
      </button>
    </>
  );
}
