'use client';
/**
 * De dónde salen las posiciones, según dónde corra la app.
 *
 * - **En el navegador**: `navigator.geolocation`. Se para en cuanto la pantalla
 *   se bloquea; es el límite que tenemos desde siempre.
 * - **Dentro del APK**: el GPS nativo con servicio en primer plano, que sigue
 *   midiendo con el teléfono en el bolsillo. Probado contra un Garmin.
 *
 * El resto del motor (`lib/session.ts`) no sabe cuál de los dos está usando.
 */
export type Posicion = { lat: number; lng: number; t: number; acc: number; alt?: number };
export type Parar = () => void;

export const enLaApp = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

export async function seguirPosicion(
  alLlegar: (p: Posicion) => void,
  alFallar: (mensaje: string) => void,
): Promise<Parar> {
  if (enLaApp()) {
    const { registerPlugin } = await import('@capacitor/core');
    const BG: any = registerPlugin('BackgroundGeolocation');

    // El aviso de notificación se pide aparte y sin esperarlo: encadenar dos
    // diálogos de permiso hace que el segundo a veces no llegue a salir.
    (async () => {
      try {
        const AV: any = registerPlugin('LocalNotifications');
        const e = await AV.checkPermissions();
        if (e.display !== 'granted') await AV.requestPermissions();
      } catch { /* sin notificación se mide igual, solo es menos estable */ }
    })();

    const id = await BG.addWatcher(
      {
        backgroundTitle: 'MyCoachRuns está grabando tu carrera',
        backgroundMessage: 'Toca para volver a la app.',
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
      },
      (pos: any, err: any) => {
        if (err) {
          // El complemento usa el mismo código para dos cosas distintas.
          const m = String(err.message ?? '').toLowerCase();
          alFallar(m.includes('location services') || m.includes('not enabled')
            ? 'La ubicación del teléfono está apagada. Enciéndela en los ajustes de Android.'
            : 'Permite el acceso a la ubicación para poder grabar.');
          return;
        }
        alLlegar({ lat: pos.latitude, lng: pos.longitude, t: pos.time || Date.now(), acc: pos.accuracy, alt: pos.altitude ?? undefined });
      },
    );
    return () => { try { BG.removeWatcher({ id }); } catch {} };
  }

  if (!('geolocation' in navigator)) { alFallar('Este navegador no tiene GPS.'); return () => {}; }
  const w = navigator.geolocation.watchPosition(
    (pos) => alLlegar({
      lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp,
      acc: pos.coords.accuracy, alt: pos.coords.altitude ?? undefined,
    }),
    (e) => alFallar(e.code === 1 ? 'Permite el acceso a la ubicación en los ajustes del navegador.' : 'Buscando señal GPS…'),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(w);
}
