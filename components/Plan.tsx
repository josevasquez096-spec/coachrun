'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TYPE_LABEL, todayLocal } from '@/lib/format';
import { expand, describe, type Phase } from '@/lib/phases';
import WorkoutForm from './WorkoutForm';

type W = {
  id: string; date: string; type: string; title: string; description: string | null;
  target_distance_km: number | null; target_duration_min: number | null; target_pace: string | null;
  completed: boolean; phases: Phase[] | null;
};

/** Lunes de la semana a la que pertenece una fecha (formato YYYY-MM-DD). */
function lunesDe(fecha: string) {
  const d = new Date(fecha + 'T12:00');
  const dia = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dia);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const corto = (f: string) => new Date(f + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });

export default function Plan({ workouts, editable = false, athleteId }: { workouts: W[]; editable?: boolean; athleteId?: string }) {
  const r = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [helpId, setHelpId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const hoy = todayLocal();

  async function remove(id: string) {
    if (!confirm('¿Borrar este entrenamiento?')) return;
    setErr('');
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
      const txt = await res.text();
      if (!res.ok) {
        let motivo = txt.slice(0, 140);
        try { motivo = JSON.parse(txt).error ?? motivo; } catch {}
        const detalle = `No se pudo borrar (${res.status}). ${motivo}`;
        setErr(detalle); alert(detalle);
        return;
      }
      r.refresh();
    } catch (e: any) {
      const detalle = `No se pudo borrar: ${e?.message ?? 'error de red'}`;
      setErr(detalle); alert(detalle);
    }
  }
  async function toggle(w: W) {
    await fetch(`/api/workouts/${w.id}/hecho`, { method: 'POST', body: JSON.stringify({ completed: !w.completed }) });
    r.refresh();
  }

  if (!workouts.length) return <p className="card muted">Todavía no hay entrenamientos en el plan.</p>;

  // Agrupamos por semana (lunes a domingo)
  const semanas = new Map<string, W[]>();
  [...workouts].sort((a, b) => a.date.localeCompare(b.date)).forEach((w) => {
    const k = lunesDe(w.date);
    if (!semanas.has(k)) semanas.set(k, []);
    semanas.get(k)!.push(w);
  });
  const semanaActual = lunesDe(hoy);

  return (
    <div>
      {err && <p className="notice">{err}</p>}
      {[...semanas.entries()].map(([lunes, lista]) => {
        const dom = new Date(lunes + 'T12:00'); dom.setDate(dom.getDate() + 6);
        const domStr = `${dom.getFullYear()}-${String(dom.getMonth() + 1).padStart(2, '0')}-${String(dom.getDate()).padStart(2, '0')}`;
        const km = lista.reduce((s, w) => s + (w.target_distance_km ?? 0), 0);
        const hechos = lista.filter((w) => w.completed).length;
        return (
          <section key={lunes} style={{ marginBottom: 26 }}>
            <div className="sec-head">
              <span>{lunes === semanaActual ? 'Esta semana' : `${corto(lunes)} – ${corto(domStr)}`}</span>
              <span className="muted">{hechos}/{lista.length} · {km ? `${km.toFixed(1)} km` : '—'}</span>
            </div>

            {lista.map((x) => {
              const steps = x.phases ? expand(x.phases) : [];
              const d = new Date(x.date + 'T12:00');
              return (
                <article key={x.id} className={`wo ${x.date === hoy ? 'wo-hoy' : ''} ${x.completed ? 'wo-hecho' : ''}`}>
                  <div className="wo-day">
                    <b>{d.getDate()}</b>
                    <small>{d.toLocaleDateString('es', { weekday: 'short' })}</small>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`pill ${x.completed ? 'done' : x.type === 'rest' ? 'rest' : ''}`}>
                        {x.completed ? '✓ Hecho' : TYPE_LABEL[x.type]}
                      </span>
                      {x.date === hoy && !x.completed && <span className="pill" style={{ background: 'var(--ink)', color: '#fff' }}>Hoy</span>}
                    </div>
                    <h3 className="wo-title">{x.title}</h3>
                    {(x.target_distance_km || x.target_duration_min || x.target_pace) && (
                      <div className="wo-meta">
                        {[x.target_distance_km && `${x.target_distance_km} km`,
                          x.target_duration_min && `${x.target_duration_min} min`,
                          x.target_pace && `${x.target_pace} /km`].filter(Boolean).join('  ·  ')}
                      </div>
                    )}
                    {x.description && <p className="wo-desc">{x.description}</p>}

                    <div className="wo-acts">
                      <button className="chip" onClick={() => toggle(x)}>{x.completed ? 'Deshacer' : 'Marcar hecho'}</button>
                      {steps.length > 0 && (
                        <button className="chip" onClick={() => setOpenId(openId === x.id ? null : x.id)}>
                          {openId === x.id ? 'Ocultar fases' : `Ver ${steps.length} fases`}
                        </button>
                      )}
                      {x.phases && x.phases.length > 0 && (
                        <>
                          <a className="chip" href={`/api/workouts/${x.id}/fit`}>Descargar .FIT</a>
                          <button className="chip" onClick={() => setHelpId(helpId === x.id ? null : x.id)}>¿Cómo lo paso al Garmin?</button>
                        </>
                      )}
                      {editable && <button className="chip" onClick={() => setEditId(editId === x.id ? null : x.id)}>{editId === x.id ? 'Cerrar' : 'Editar'}</button>}
                      {editable && <button className="chip danger" onClick={() => remove(x.id)}>Borrar</button>}
                    </div>

                    {helpId === x.id && (
                      <div className="notice" style={{ marginTop: 8, fontSize: 13 }}>
                        No lo subas por la web de Garmin Connect: ahí solo se importan actividades ya hechas, y saldría como una ruta.
                        <br />1. Conecta el reloj al computador con el cable USB.
                        <br />2. Abre la unidad del reloj y entra a <b>Garmin → NewFiles</b>.
                        <br />3. Copia el .FIT ahí dentro y desconecta el reloj.
                        <br />4. En el reloj: Entrenamiento → Entrenamientos.
                      </div>
                    )}

                    {openId === x.id && (
                      <ol className="fases">
                        {x.phases!.map((p, i) => (
                          <li key={p.id}>
                            <span className="n">{i + 1}</span>
                            <div><b>{p.name}</b><div className="muted" style={{ fontSize: 13 }}>{describe(p)}</div></div>
                          </li>
                        ))}
                      </ol>
                    )}

                    {editable && editId === x.id && athleteId && (
                      <div style={{ marginTop: 10 }}>
                        <WorkoutForm athleteId={athleteId} existing={x} onDone={() => setEditId(null)} />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
