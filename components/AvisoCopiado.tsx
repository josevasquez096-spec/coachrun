'use client';
import { useSyncExternalStore } from 'react';
import * as portapapeles from '@/lib/portapapeles';
import { useIdioma } from '@/lib/idioma';

/** Recordatorio en la lista de alumnos de que hay algo copiado esperando. */
export default function AvisoCopiado() {
  const { t } = useIdioma();
  const c = useSyncExternalStore(portapapeles.suscribir, portapapeles.leer, portapapeles.leerEnServidor);
  if (!c) return null;
  return (
    <p className="notice" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{(() => {
        const [antes, despues] = t('pegar.aviso', { titulo: '\u0000' }).split('\u0000');
        return <>{antes}<b>{c.title}</b>{despues}</>;
      })()}</span>
      <button className="chip" onClick={portapapeles.vaciar}>{t('pegar.quitar')}</button>
    </p>
  );
}
