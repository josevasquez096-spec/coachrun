'use client';
import { useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fmtPace, fmtTime, todayLocal } from '@/lib/format';
import { describe, expand, fmtAmount, fmtPaceStr, type Phase, type Step } from '@/lib/phases';
import { zonas, zonaDe, RPE_LABEL, type Zona } from '@/lib/zones';
import { bleDisponible } from '@/lib/ble';
import * as ses from '@/lib/session';

const RunMap = dynamic(() => import('./RunMap'), { ssr: false });

type Pendiente = { id: string; date: string; title: string; target_distance_km: number | null; target_pace: string | null; phases: Phase[] | null; completed: boolean };
type Perfil = { max_hr: number | null; resting_hr: number | null };

/**
 * El entrenamiento, en resumen. Una línea por fase del coach ("12× 200 m a
 * 3:30–3:45 · recuperación 1 min") en vez de una línea por repetición, que en
 * una sesión de series se hacía larguísima. Se toca para ver el paso a paso.
 */
function ListaFases({ fases, steps, idx, activa }: { fases: Phase[]; steps: Step[]; idx: number; activa: boolean }) {
  const [abierta, setAbierta] = useState(false);
  if (!steps.length) return null;

  const resumible = fases.length > 0 && fases.length < steps.length;
  const verPasos = abierta || !resumible;
  const terminado = activa && idx >= steps.length;
  const faseActual = activa && !terminado ? steps[idx]?.fase ?? 0 : -1;

  // Repeticiones de una fase (sin contar las recuperaciones) y cuántas van.
  const repes = (f: number) => steps.filter((x) => x.fase === f && x.kind !== 'rest').length;
  const repesHechas = (f: number) => steps.slice(0, idx).filter((x) => x.fase === f && x.kind !== 'rest').length;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {resumible ? (
        <button className="resumen-cab" onClick={() => setAbierta(!abierta)}>
          <span>{abierta ? 'PASO A PASO' : `ENTRENAMIENTO · ${fases.length} ${fases.length === 1 ? 'BLOQUE' : 'BLOQUES'}`}</span>
          <span className="ver">{abierta ? 'Ver resumen ▲' : 'Ver cada repetición ▼'}</span>
        </button>
      ) : (
        <div className="resumen-cab" style={{ cursor: 'default' }}><span>ENTRENAMIENTO · {steps.length} FASES</span></div>
      )}

      {!verPasos && fases.map((p, i) => {
        const hecha = terminado || (faseActual >= 0 && i < faseActual);
        const ahora = i === faseActual;
        const total = repes(i);
        return (
          <div key={i} className={`fase-fila ${hecha ? 'hecha' : ''} ${ahora ? 'ahora' : ''}`}>
            <span className="fase-n">{hecha ? '✓' : i + 1}</span>
            <span className="fase-txt">
              <b>{p.name}</b>
              <small className="muted">
                {describe(p)}
                {ahora && total > 1 ? ` · vas por la ${Math.min(repesHechas(i) + 1, total)} de ${total}` : ''}
              </small>
            </span>
          </div>
        );
      })}

      {verPasos && steps.map((f, i) => {
        const hecha = activa && i < idx;
        const ahora = activa && i === idx;
        return (
          <div key={i} className={`fase-fila ${hecha ? 'hecha' : ''} ${ahora ? 'ahora' : ''}`}>
            <span className="fase-n">{hecha ? '✓' : i + 1}</span>
            <span className="fase-txt">
              <b>{f.name}</b>
              <small className="muted">
                {fmtAmount(f.mode, f.meters, f.seconds)}
                {f.paceLow || f.paceHigh ? ` · ${[fmtPaceStr(f.paceLow), fmtPaceStr(f.paceHigh)].filter(Boolean).join('–')} /km` : ''}
                {f.hrZone ? ` · zona ${f.hrZone}` : ''}
              </small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Recorder({ pendientes, hasStrava, perfil }: { pendientes: Pendiente[]; hasStrava: boolean; perfil?: Perfil }) {
  const S = useSyncExternalStore(ses.suscribir, ses.leer, ses.leerEnServidor);
  const hoy = todayLocal();
  const delDia = pendientes.filter((p) => p.date === hoy);
  const otros = pendientes.filter((p) => p.date !== hoy && !p.completed);
  const inicial = delDia.find((p) => !p.completed) ?? delDia[0] ?? null;

  const [elegido, setElegido] = useState<Pendiente | null>(inicial);
  const [libre, setLibre] = useState(false);
  const [sonido, setSonido] = useState(true);

  const enMarcha = S.estado !== 'idle';
  const previo = libre ? null : elegido;
  // Antes de empezar mandan las fases del entrenamiento elegido; una vez en
  // marcha manda lo que guarda el motor, que es lo que se está corriendo.
  const steps: Step[] = enMarcha ? S.steps : (previo?.phases ? expand(previo.phases) : []);
  const fases: Phase[] = enMarcha ? S.fases : (previo?.phases ?? []);
  const idx = enMarcha ? S.idx : 0;

  const zs: Zona[] | null = zonas(perfil?.max_hr, perfil?.resting_hr);
  const step: Step | undefined = steps[idx];
  const stepTarget = step ? (step.mode === 'distance' ? step.meters ?? 0 : step.seconds ?? 0) : 0;
  const stepDone = step ? (step.mode === 'distance' ? S.stepDist : S.stepTime) : 0;
  const stepPct = stepTarget ? Math.min(100, (stepDone / stepTarget) * 100) : 0;
  const zonaActual = S.hr ? zonaDe(S.hr, zs) : null;
  const zonaObjetivo = step?.hrZone && zs ? zs[step.hrZone - 1] : null;

  const pace = S.dist > 0 ? S.elapsed / (S.dist / 1000) : 0;
  const onTarget = step?.paceLow && step?.paceHigh && S.recentPace
    ? S.recentPace < step.paceLow ? 'rápido' : S.recentPace > step.paceHigh ? 'lento' : 'en ritmo' : null;

  function empezar() {
    ses.iniciar({
      workoutId: previo?.id ?? null,
      titulo: previo?.title ?? 'Carrera',
      steps, fases, sonido, subirStrava: hasStrava,
    });
  }

  return (
    <div>
      {S.estado === 'idle' && (delDia.length > 0 || otros.length > 0) && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>¿QUÉ VAS A CORRER?</div>
          {[...delDia, ...otros].map((p) => {
            const sel = !libre && elegido?.id === p.id;
            const fecha = new Date(p.date + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
            return (
              <button key={p.id} onClick={() => { setElegido(p); setLibre(false); }} className={`elige ${sel ? 'on' : ''}`}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title} {p.completed && <span className="muted" style={{ fontWeight: 400 }}>· ya marcado</span>}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {p.date === hoy ? 'Hoy' : fecha}
                  {p.phases?.length ? ` · ${expand(p.phases).length} fases` : p.target_distance_km ? ` · ${p.target_distance_km} km` : ''}
                </div>
              </button>
            );
          })}
          <button onClick={() => setLibre(true)} className={`elige ${libre ? 'on' : ''}`}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Carrera libre</div>
            <div className="muted" style={{ fontSize: 13 }}>Sin entrenamiento asignado</div>
          </button>
        </div>
      )}

      {enMarcha && (
        <div className="card" style={{ marginBottom: 12 }}>
          <span className="pill">{S.estado === 'paused' ? 'En pausa' : S.estado === 'running' ? 'En marcha' : 'Terminada'}</span>{' '}
          <b>{S.titulo}</b>
        </div>
      )}

      {steps.length > 0 && step && S.estado !== 'idle' && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--ink)', borderWidth: 2 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>FASE {idx + 1} DE {steps.length}</div>
          <div style={{ fontSize: 19, fontWeight: 800, margin: '2px 0 4px' }}>{step.name}</div>
          <div className="muted" style={{ fontSize: 14 }}>
            {step.mode === 'distance'
              ? `${(S.stepDist / 1000).toFixed(2)} / ${((step.meters ?? 0) / 1000).toFixed(2)} km`
              : `${fmtTime(S.stepTime)} / ${fmtTime(step.seconds ?? 0)}`}
            {step.paceLow && step.paceHigh ? ` · objetivo ${fmtPaceStr(step.paceLow)}–${fmtPaceStr(step.paceHigh)}` : ''}
            {zonaObjetivo ? ` · zona ${zonaObjetivo.n} (${zonaObjetivo.min}–${zonaObjetivo.max} ppm)` : ''}
          </div>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stepPct}%`, background: 'var(--lima)', transition: 'width .3s' }} />
          </div>
          {onTarget && (
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14, color: onTarget === 'en ritmo' ? 'var(--verde-txt)' : 'var(--alerta)' }}>
              {onTarget === 'en ritmo' ? '✓ En ritmo' : onTarget === 'rápido' ? '▲ Vas rápido, afloja' : '▼ Vas lento, aprieta'} · {fmtPace(S.recentPace)} /km
            </div>
          )}
          {zonaObjetivo && S.hr && (
            <div style={{ marginTop: 6, fontWeight: 700, fontSize: 14, color: S.hr >= zonaObjetivo.min && S.hr <= zonaObjetivo.max ? 'var(--verde-txt)' : 'var(--alerta)' }}>
              {S.hr >= zonaObjetivo.min && S.hr <= zonaObjetivo.max ? '✓ En zona' : S.hr > zonaObjetivo.max ? '▲ Pulso alto' : '▼ Pulso bajo'} · {S.hr} ppm
            </div>
          )}
          {(S.estado === 'running' || S.estado === 'paused') && (
            <button className="btn ghost block" style={{ marginTop: 10, padding: '6px 12px', fontSize: 13 }} onClick={ses.saltarFase}>Saltar a la siguiente fase</button>
          )}
        </div>
      )}

      {steps.length > 0 && S.estado !== 'idle' && idx >= steps.length && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--verde-txt)', borderWidth: 2 }}>
          <b>Entrenamiento completado.</b>
          <div className="muted" style={{ fontSize: 14 }}>Puedes seguir corriendo o pulsar Terminar.</div>
        </div>
      )}

      <ListaFases fases={fases} steps={steps} idx={idx} activa={enMarcha} />

      <div className="rec-map"><RunMap points={S.pts} /></div>

      <div className="metrics">
        <div className="metric"><b>{(S.dist / 1000).toFixed(2)}</b><small>km</small></div>
        <div className="metric"><b>{fmtTime(S.elapsed)}</b><small>tiempo</small></div>
        <div className="metric"><b>{fmtPace(pace)}</b><small>min/km</small></div>
      </div>

      {S.hr && (
        <div className="metric" style={{ marginBottom: 10, borderColor: zonaActual?.color ?? 'var(--line)' }}>
          <b style={{ color: zonaActual?.color }}>{S.hr}</b>
          <small>ppm {zonaActual ? `· zona ${zonaActual.n} ${zonaActual.nombre}` : ''}</small>
        </div>
      )}

      {(S.estado === 'running' || S.estado === 'paused') && S.gpsAcc != null && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: -4 }}>
          Precisión GPS: ±{S.gpsAcc} m {S.gpsAcc > 25 ? '— señal débil, la distancia puede quedarse corta' : ''}
        </p>
      )}

      <div className="rec-actions">
        {S.estado === 'idle' && <>
          <label className="check">
            <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} />
            Avisos por voz y sonido en cada kilómetro
          </label>
          {bleDisponible() && (
            <button className="btn ghost block" onClick={ses.conectarSensor}>
              {S.sensor ? `Sensor: ${S.sensor}` : 'Conectar cinturón de pulso'}
            </button>
          )}
          <button className="btn go block" onClick={empezar}>
            {steps.length ? `Iniciar entrenamiento (${steps.length} fases)` : 'Iniciar carrera libre'}
          </button>
        </>}

        {S.estado === 'running' && <button className="btn block" onClick={ses.pausar}>Pausar</button>}

        {S.estado === 'paused' && <>
          <button className="btn go block" onClick={ses.continuar}>Continuar</button>
          <button className="btn stop block" onClick={ses.terminar}>Terminar</button>
        </>}

        {S.estado === 'done' && <>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>¿Cómo se sintió?</div>
            <div className="rpe">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button key={n} className={S.rpe === n ? 'on' : ''} onClick={() => ses.ponerRpe(S.rpe === n ? null : n)}>{n}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 13, minHeight: 18 }}>{S.rpe ? `${S.rpe} · ${RPE_LABEL[S.rpe]}` : 'Esfuerzo percibido (opcional)'}</div>
            <div className="field" style={{ marginTop: 10 }}>
              <textarea rows={2} value={S.notas} onChange={(e) => ses.ponerNotas(e.target.value)} placeholder="Notas para tu entrenador (opcional)" />
            </div>
            {hasStrava && (
              <label className="check">
                <input type="checkbox" checked={S.subirStrava} onChange={(e) => ses.ponerStrava(e.target.checked)} />
                Subir también a Strava
              </label>
            )}
          </div>
          <button className="btn flare block" onClick={() => ses.guardar(hasStrava)} disabled={S.pts.length < 2}>
            {hasStrava && S.subirStrava ? 'Guardar y subir a Strava' : 'Guardar solo en MyCoachRuns'}
          </button>
          <button className="btn ghost block" onClick={() => { if (confirm('¿Descartar esta carrera? No se podrá recuperar.')) ses.descartar(); }}>Descartar</button>
        </>}

        {S.estado === 'saving' && <button className="btn block" disabled>Guardando…</button>}

        {S.estado === 'saved' && <>
          <Link className="btn block" href="/activities">Ver mis actividades</Link>
          <button className="btn ghost block" onClick={ses.descartar}>Grabar otra</button>
        </>}
      </div>

      {S.msg && <p className="notice" style={{ marginTop: 12 }}>{S.msg}</p>}

      {S.estado === 'idle' && (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Puedes moverte por las demás pestañas sin parar la grabación: solo se detiene con Pausar o Terminar.
          Lo que sí la corta es bloquear el teléfono o salir de la app, porque el navegador apaga el GPS (sobre todo en iPhone).
          Para carreras largas es más fiable el reloj, y la actividad llegará sola desde Strava.
        </p>
      )}
    </div>
  );
}
