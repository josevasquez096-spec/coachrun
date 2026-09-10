'use client';
import { useEffect, useState } from 'react';

/**
 * Distintivo que solo se ve dentro de la app de Android (o si se abre la web
 * con `?desde=app`).
 *
 * Responde a una pregunta concreta: cuando la cáscara de Android carga esta web
 * desde internet en vez de llevarla dentro, ¿le sigue inyectando el puente
 * nativo? Si no lo hiciera, `window.Capacitor` no existiría aquí, y sin la
 * marca en la dirección no habría forma de distinguir eso de un navegador
 * normal: no se vería nada y no aprenderíamos nada.
 */
export default function PuenteNativo() {
  const [txt, setTxt] = useState<string | null>(null);
  const [bien, setBien] = useState(false);

  useEffect(() => {
    const C: any = (window as any).Capacitor;
    const desdeApp = new URLSearchParams(location.search).get('desde') === 'app';
    if (!C && !desdeApp) return;                 // navegador normal: no se enseña nada

    if (!C) { setTxt('app · SIN puente nativo'); setBien(false); return; }
    try {
      const plat = C.getPlatform?.() ?? '?';
      const nativo = !!C.isNativePlatform?.();
      const registrar = typeof C.registerPlugin === 'function';
      const gps = !!C.Plugins?.BackgroundGeolocation;
      setBien(nativo && (registrar || gps));
      setTxt(`${plat} · puente ${nativo ? 'sí' : 'no'} · registerPlugin ${registrar ? 'sí' : 'no'} · GPS ${gps ? 'sí' : 'no'}`);
    } catch (e: any) {
      setTxt(`app · error: ${e?.message ?? 'desconocido'}`);
    }
  }, []);

  if (!txt) return null;
  return (
    <div style={{
      position: 'fixed', left: 8, bottom: 68, zIndex: 60, padding: '5px 10px', borderRadius: 999,
      fontSize: 10.5, fontWeight: 700, color: '#fff', pointerEvents: 'none', maxWidth: 'calc(100vw - 16px)',
      background: bien ? 'var(--verde-txt)' : 'var(--alerta)',
    }}>{txt}</div>
  );
}
