'use client';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { TYPE_LABEL, fmtPace, fmtTime } from '@/lib/format';

type W = { id: string; date: string; type: string; title: string; description: string | null; target_distance_km: number | null; target_duration_min: number | null; target_pace: string | null; completed: boolean };
type A = { id: string; workout_id: string | null; name: string | null; started_at: string; distance_m: number | null; moving_time_s: number | null; source: string };

export default function Plan({ workouts, activities, editable = false }: { workouts: W[]; activities: A[]; editable?: boolean }) {
  const r = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const byDay = new Map<string, { w: W[]; a: A[] }>();
  workouts.forEach((w) => { const d = byDay.get(w.date) ?? { w: [], a: [] }; d.w.push(w); byDay.set(w.date, d); });
  activities.forEach((a) => { const k = a.started_at.slice(0, 10); const d = byDay.get(k) ?? { w: [], a: [] }; d.a.push(a); byDay.set(k, d); });
  const days = [...byDay.keys()].sort();
  async function remove(id: string) { if (!confirm('¿Borrar este entrenamiento?')) return; await supabaseBrowser().from('workouts').delete().eq('id', id); r.refresh(); }
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
              {w.map((x) => (
                <div key={x.id} className="wk" style={{ marginBottom: 8 }}>
                  <div>
                    <span className={`pill ${x.completed ? 'done' : x.type === 'rest' ? 'rest' : ''}`}>{x.completed ? 'Hecho' : TYPE_LABEL[x.type]}</span>
                    <div className="title" style={{ marginTop: 4 }}>{x.title}</div>
                    <div className="targets">{[x.target_distance_km && `${x.target_distance_km} km`, x.target_duration_min && `${x.target_duration_min} min`, x.target_pace && `${x.target_pace} /km`].filter(Boolean).join(' · ')}</div>
                    {x.description && <div className="desc">{x.description}</div>}
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => toggle(x)}>{x.completed ? 'Deshacer' : 'Hecho'}</button>
                    {editable && <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => remove(x.id)}>Borrar</button>}
                  </div>
                </div>
              ))}
              {a.map((x) => (
                <div key={x.id} className="targets" style={{ paddingLeft: 2 }}>
                  ● {x.name ?? 'Actividad'} — {((x.distance_m ?? 0) / 1000).toFixed(2)} km · {fmtTime(x.moving_time_s ?? 0)} · {fmtPace((x.moving_time_s ?? 0) / ((x.distance_m ?? 1) / 1000))} /km <span className="muted">({x.source})</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
