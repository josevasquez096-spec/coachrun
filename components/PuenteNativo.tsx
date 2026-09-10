'use client';
import { useEffect, useState } from 'react';

/**
 * Solo se ve dentro de la app de Android, nunca en el navegador.
 *
 * Existe para responder a una pregunta concreta: cuando la cáscara de Android
 * carga esta web desde internet en lugar de llevarla dentro, ¿sigue teniendo
 * acceso al GPS nativo? Hay un fallo conocido por el que no. Este distintivo
 * lo dice a la cara en vez de dejarnos suponerlo.
 */
export default function PuenteNativo() {
  const [txt, setTxt] = useState<string | null>(null);
  const [bien, setBien] = useState(false);

  useEffect(() => {
    const C: any = (window as any).Capacitor;
    if (!C) return;                                  // navegador normal: no se enseña nada
    try {
      const nativo = !!C.isNativePlatform?.();
      const plat = C.getPlatform?.() ?? '?';
      const gps = !!C.isPluginAvailable?.('BackgroundGeolocation');
      setBien(nativo && gps);
      setTxt(`app: ${plat} · GPS nativo: ${gps ? 'sí' : 'NO'}`);
    } catch (e: any) {
      setTxt(`app: error (${e?.message ?? 'desconocido'})`);
    }
  }, []);

  if (!txt) return null;
  return (
    <div style={{
      position: 'fixed', left: 8, bottom: 68, zIndex: 60, padding: '5px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, color: '#fff', pointerEvents: 'none',
      background: bien ? 'var(--verde-txt)' : 'var(--alerta)',
    }}>{txt}</div>
  );
}
