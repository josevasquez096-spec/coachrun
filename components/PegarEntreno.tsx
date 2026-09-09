'use client';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { todayLocal } from '@/lib/format';
import { describe } from '@/lib/phases';
import * as portapapeles from '@/lib/portapapeles';

/** El aviso de "tienes un entrenamiento copiado" con el botón para pegarlo aquí. */
export default function PegarEntreno({ athleteId, nombre }: { athleteId: string; nombre: string }) {
  const r = useRouter();
  const c = useSyncExternalStore(portapapeles.suscribir, portapapeles.leer, portapapeles.leerEnServidor);
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<'listo' | 'pegando' | 'hecho'>('listo');
  const [err, setErr] = useState('');

  if (!c) return null;
  const hoy = todayLocal();
  const cuando = fecha || (c.fecha >= hoy ? c.fecha : hoy);

  async function pegar() {
    setEstado('pegando'); setErr('');
    try {
      const res = await fetch('/api/workouts/copiar', {
        method: 'POST',
        body: JSON.stringify({ athleteId, date: cuando, workout: c }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? 'No se pudo pegar.'); setEstado('listo'); return; }
      setEstado('hecho');
      r.refresh();
    } catch {
      setErr('No se pudo pegar. Revisa la conexión.'); setEstado('listo');
    }
  }

  return (
    <div className="card" style={{ borderColor: 'var(--ink)', borderWidth: 2, marginBottom: 14 }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>ENTRENAMIENTO COPIADO</div>
      <div style={{ fontWeight: 700, fontSize: 16, margin: '3px 0 2px' }}>{c.title}</div>
      <div className="muted" style={{ fontSize: 13 }}>
        De {c.deQuien}
        {c.phases?.length ? ` · ${c.phases.length} ${c.phases.length === 1 ? 'bloque' : 'bloques'}` : ''}
        {c.target_distance_km ? ` · ${c.target_distance_km} km` : ''}
      </div>
      {c.phases?.length ? (
        <ol className="fases" style={{ marginTop: 8 }}>
          {c.phases.map((p, i) => (
            <li key={i}><span className="n">{i + 1}</span>
              <div><b>{p.name}</b><div className="muted" style={{ fontSize: 13 }}>{describe(p)}</div></div>
            </li>
          ))}
        </ol>
      ) : null}

      {estado === 'hecho' ? (
        <>
          <p className="notice" style={{ marginTop: 10 }}>Pegado en el plan de {nombre}.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEstado('listo')}>Pegar otra fecha</button>
            <button className="btn ghost" style={{ flex: 1 }} onClick={portapapeles.vaciar}>Quitar copia</button>
          </div>
        </>
      ) : (
        <>
          <div className="field" style={{ marginTop: 12 }}>
            <label>¿Qué día lo hace {nombre}?</label>
            <input type="date" value={cuando} onChange={(e) => setFecha(e.target.value)} />
          </div>
          {err && <p className="notice">{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn flare" style={{ flex: 1 }} onClick={pegar} disabled={estado === 'pegando'}>
              {estado === 'pegando' ? 'Pegando…' : `Pegar en el plan de ${nombre}`}
            </button>
            <button className="btn ghost" onClick={portapapeles.vaciar}>Quitar</button>
          </div>
        </>
      )}
    </div>
  );
}
