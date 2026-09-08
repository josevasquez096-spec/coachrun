'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { TYPE_LABEL, fmtPace, fmtTime } from '@/lib/format';
import { expand, describe, type Phase } from '@/lib/phases';

type W = { id: string; date: string; type: string; title: string; description: string | null; target_distance_km: number | null; target_duration_min: number | null; target_pace: string | null; completed: boolean; phases: Phase[] | null };
type A = { id: string; workout_id: string | null; name: string | null; started_at: string; distance_m: number | null; moving_time_s: number | null; source: string; avg_hr: number | null; raw: any };

function Splits({ a }: { a: A }) {
  const splits = a.raw?.splits_metric;
  if (!Array.isArray(splits) || splits.length < 2) return null;
  const paces = splits.map((s: any) => s.moving_time / (s.distance / 1000));
  const best = Math.min(...paces), worst = Math.max(...paces);
  return (
    <div style={{ marginTop: 8 }}>
      {splits.map((s: any, i: number) => {
        const p = paces[i];
        const pct = worst > best ? 20 + ((worst - p) / (worst - best)) * 80 : 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 2 }}>
            <span className="muted" style={{ width: 22 }}>{i + 1}</span>
            <div style={{ flex: 1, height: 12, background: 'var(--bg)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--flare)', borderRadius: 3 }} />
            </div>
            <span style={{ width: 46, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPace(p)}</span>
            {s.average_heartrate ? <span className="muted" style={{ width: 40, textAlign: 'right' }}>{Math.round(s.average_heartrate)} ppm</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function Plan({ workouts, activities, editable = false, athleteId }: { workouts: W[]; activities: A[]; editable?: boolean; athleteId?: string }) {
  const r = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [helpId, setHelpId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const byDay = new Map<string, { w: W[]; a: A[] }>();
  workouts.forEach((w) => { const d = byDay.get(w.date) ?? { w: [], a: [] }; d.w.push(w); byDay.set(w.date, d); });
  activities.forEach((a) => { const k = a.started_at.slice(0, 10); const d = byDay.get(k) ?? { w: [], a: [] }; d.a.push(a); byDay.set(k, d); });
  const days = [...byDay.keys()].sort();

  async function remove(id: string, title: string) {
    if (!confirm('¿Borrar este entrenamiento?')) return;
    await supabaseBrowser().from('workouts').delete().eq('id', id);
    if (athleteId) fetch('/api/push/notify', { method: 'POST', body: JSON.stringify({ athleteId, title: 'Entrenamiento cancelado', body: title }) }).catch(() => {});
    r.refresh();
  }
  async function toggle(w: W) { await supabaseBrowser().from('workouts').update({ completed: !w.completed }).eq('id', w.id); r.refresh(); }
  if (!days.length) return <p className="card muted">Todavía no hay nada en el plan.</p>;

  return (
    <div className="plan">
      {days.map((d) => {
        const dt = new Date(d + 'T12:00'); const { w, a } = byDay.get(d)!;
        return (
          <div key={d} className={`day ${d === today ? 'today' : ''}`}>
            <div className="when"><b>{dt.getDate()}</b><small>{dt.toLocaleDateString('es', { weekday: 'short', month: 'short' })}</small></div>
            <div>
              {w.map((x) => {
                const steps = x.phases ? expand(x.phases) : [];
                return (
                  <div key={x.id} style={{ marginBottom: 10 }}>
                    <div className="wk">
                      <div>
                        <span className={`pill ${x.completed ? 'done' : x.type === 'rest' ? 'rest' : ''}`}>{x.completed ? 'Hecho' : TYPE_LABEL[x.type]}</span>
                        <div className="title" style={{ marginTop: 4 }}>{x.title}</div>
                        <div className="targets">{[x.target_distance_km && `${x.target_distance_km} km`, x.target_duration_min && `${x.target_duration_min} min`, x.target_pace && `${x.target_pace} /km`].filter(Boolean).join(' · ')}</div>
                        {x.description && <div className="desc">{x.description}</div>}
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => toggle(x)}>{x.completed ? 'Deshacer' : 'Hecho'}</button>
                        {editable && <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => remove(x.id, x.title)}>Borrar</button>}
                      </div>
                    </div>

                    {x.phases && x.phases.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <button className="btn ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setOpenId(openId === x.id ? null : x.id)}>
                          {openId === x.id ? 'Ocultar' : `Ver ${steps.length} fases`}
                        </button>
                        <a className="btn ghost" style={{ padding: '4px 12px', fontSize: 12, marginLeft: 6 }} href={`/api/workouts/${x.id}/fit`}>Descargar .FIT</a>
                        <button className="btn ghost" style={{ padding: '4px 12px', fontSize: 12, marginLeft: 6 }} onClick={() => setHelpId(helpId === x.id ? null : x.id)}>¿Cómo lo paso al Garmin?</button>
                        {helpId === x.id && (
                          <div className="notice" style={{ marginTop: 8, fontSize: 13 }}>
                            No lo subas por la web de Garmin Connect: ahí solo se importan actividades ya hechas, y saldría como una ruta.
                            <br />1. Conecta el reloj al computador con el cable USB.
                            <br />2. Abre la unidad del reloj y entra a la carpeta <b>Garmin → NewFiles</b>.
                            <br />3. Copia el .FIT ahí dentro y desconecta el reloj.
                            <br />4. En el reloj: Entrenamiento → Entrenamientos. Aparecerá con sus fases y ritmos.
                          </div>
                        )}
                        {openId === x.id && (
                          <div style={{ marginTop: 8, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>
                            {x.phases.map((p, i) => (
                              <div key={p.id} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13 }}>
                                <span style={{ color: 'var(--flare)', fontWeight: 700 }}>{i + 1}</span>
                                <div><b>{p.name}</b> <span className="muted">— {describe(p)}</span></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {a.map((x) => (
                <div key={x.id} style={{ marginTop: 6 }}>
                  <div className="targets">
                    ● {x.name ?? 'Actividad'} — {((x.distance_m ?? 0) / 1000).toFixed(2)} km · {fmtTime(x.moving_time_s ?? 0)} · {fmtPace((x.moving_time_s ?? 0) / ((x.distance_m ?? 1) / 1000))} /km
                    {x.avg_hr ? ` · ${Math.round(x.avg_hr)} ppm` : ''} <span className="muted">({x.source})</span>
                  </div>
                  <Splits a={x} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
