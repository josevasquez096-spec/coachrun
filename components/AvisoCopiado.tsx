'use client';
import { useSyncExternalStore } from 'react';
import * as portapapeles from '@/lib/portapapeles';

/** Recordatorio en la lista de alumnos de que hay algo copiado esperando. */
export default function AvisoCopiado() {
  const c = useSyncExternalStore(portapapeles.suscribir, portapapeles.leer, portapapeles.leerEnServidor);
  if (!c) return null;
  return (
    <p className="notice" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
      <span>Tienes copiado <b>{c.title}</b>. Entra en un alumno para pegarlo en su plan.</span>
      <button className="chip" onClick={portapapeles.vaciar}>Quitar</button>
    </p>
  );
}
