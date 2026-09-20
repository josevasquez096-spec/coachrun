'use client';
import { useState } from 'react';
import { fmtPace, fmtTime, deporteDe, DEPORTE_ICONO, DEPORTE_LABEL } from '@/lib/format';
import ActivityOverlay from './ActivityOverlay';
import ImagenFuerza from './ImagenFuerza';
import { locale, nombreDeporte, nombreRpe, t, useIdioma } from '@/lib/idioma';

export type Act = {
  id: string; workout_id: string | null; name: string | null; started_at: string;
  distance_m: number | null; moving_time_s: number | null; avg_hr: number | null;
  source: string; polyline: string | null; raw: any; rpe?: number | null; notes?: string | null;
  type?: string | null; muscles?: string[] | null;
};

function Splits({ a }: { a: Act }) {
  const splits = a.raw?.splits_metric;
  if (!Array.isArray(splits) || splits.length < 2) return null;
  const paces = splits.map((s: any) => s.moving_time / (s.distance / 1000));
  const best = Math.min(...paces), worst = Math.max(...paces);
  return (
    <div style={{ marginTop: 12 }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t('act.parciales')}</div>
      {splits.map((s: any, i: number) => {
        const p = paces[i];
        const pct = worst > best ? 22 + ((worst - p) / (worst - best)) * 78 : 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 3 }}>
            <span className="muted" style={{ width: 20 }}>{i + 1}</span>
            <div style={{ flex: 1, height: 14, background: 'var(--bg)', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--lima)', borderRadius: 4 }} />
            </div>
            <span style={{ width: 46, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPace(p)}</span>
            {s.average_heartrate ? <span className="muted" style={{ width: 46, textAlign: 'right' }}>{Math.round(s.average_heartrate)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function Activities({ acts, propias = true }: { acts: Act[]; propias?: boolean }) {
  useIdioma();   // para que los textos cambien al cambiar de idioma
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!acts.length) return <p className="card muted">{t('act.vacio')}</p>;

  // Agrupamos por mes
  const meses = new Map<string, Act[]>();
  acts.forEach((a) => {
    const d = new Date(a.started_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    (meses.get(k) ?? meses.set(k, []).get(k)!).push(a);
  });

  return (
    <div>
      {[...meses.entries()].map(([k, lista]) => {
        const totalKm = lista.reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000;
        const ref = new Date(k + '-01T12:00');
        return (
          <section key={k} style={{ marginBottom: 22 }}>
            <div className="sec-head">
              <span>{ref.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</span>
              <span className="muted">{lista.length} · {totalKm.toFixed(1)} km</span>
            </div>
            {lista.map((a) => {
              const km = (a.distance_m ?? 0) / 1000;
              const pace = (a.moving_time_s ?? 0) / (km || 1);
              const d = new Date(a.started_at);
              const abierto = abierta === a.id;
              return (
                <div key={a.id} className="act">
                  <button className="act-head" onClick={() => setAbierta(abierto ? null : a.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="act-title">{DEPORTE_ICONO[deporteDe(a.type)] ?? ''} {a.name ?? t('act.sinNombre')}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' })} · {d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{nombreDeporte(deporteDe(a.type))}
                        {' · '}<span className={a.source === 'strava' ? 'strava' : 'muted'}>{a.source === 'strava' ? 'Strava' : 'MyCoachRuns'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>{km.toFixed(2)} km</div>
                      <div className="muted" style={{ fontSize: 13 }}>{fmtPace(pace)} /km</div>
                    </div>
                  </button>

                  {abierto && (
                    <div className="act-body">
                      <div className="stats">
                        <div><b>{km.toFixed(2)}</b><small>km</small></div>
                        <div><b>{fmtTime(a.moving_time_s ?? 0)}</b><small>{t('rec.tiempo')}</small></div>
                        <div><b>{fmtPace(pace)}</b><small>min/km</small></div>
                        {a.avg_hr ? <div><b>{Math.round(a.avg_hr)}</b><small>ppm</small></div> : null}
                        {a.raw?.total_elevation_gain ? <div><b>{Math.round(a.raw.total_elevation_gain)}</b><small>{t('act.desnivel')}</small></div> : null}
                        {a.raw?.calories ? <div><b>{Math.round(a.raw.calories)}</b><small>kcal</small></div> : null}
                      </div>
                      {(a.rpe || a.notes) && (
                        <div style={{ marginTop: 12, paddingLeft: 10, borderLeft: '3px solid var(--track)' }}>
                          {a.rpe ? <div style={{ fontSize: 13 }}><b>{t('act.esfuerzo', { n: a.rpe })}</b> · {nombreRpe(a.rpe)}</div> : null}
                          {a.notes ? <div className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{a.notes}</div> : null}
                        </div>
                      )}
                      <Splits a={a} />
                      {/* La fuerza no tiene traza ni parciales: lo suyo son los
                          músculos, y de ahí sale su imagen para compartir. */}
                      {deporteDe(a.type) === 'strength'
                        ? <ImagenFuerza a={a as any} />
                        : propias && <ActivityOverlay a={a} />}
                      {a.raw?.id && a.source === 'strava' && (
                        <a className="btn ghost block" style={{ marginTop: 8, fontSize: 13, padding: '7px 14px' }}
                          href={`https://www.strava.com/activities/${a.raw.id}`} target="_blank" rel="noopener noreferrer">{t('act.verStrava')}</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
