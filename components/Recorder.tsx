'use client';
import { useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fmtPace, fmtTime, todayLocal, deporteDe, DEPORTE_ICONO, DEPORTE_LABEL } from '@/lib/format';
import { expand, fmtAmount, fmtPaceStr, type Phase, type Step } from '@/lib/phases';
import { locale, nombreDeporte, nombreRpe, nombreZona, t, useIdioma, describirFase, nombresPorDefecto } from '@/lib/idioma';
import { zonas, zonaDe, type Zona } from '@/lib/zones';
import { bleDisponible } from '@/lib/ble';
import * as ses from '@/lib/session';

const RunMap = dynamic(() => import('./RunMap'), { ssr: false });

type Pendiente = { id: string; date: string; type?: string | null; title: string; target_distance_km: number | null; target_pace: string | null; phases: Phase[] | null; completed: boolean };

/** Lo que se puede grabar con GPS. Fuerza y descanso no se graban aquí. */
const GRABABLES = ['run', 'walk', 'trail'] as const;
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
          <span>{abierta ? t('rec.pasoAPaso') : fases.length === 1 ? t('rec.unBloque') : t('rec.bloques', { n: fases.length })}</span>
          <span className="ver">{abierta ? `${t('rec.verResumen')} ▲` : `${t('rec.verRepes')} ▼`}</span>
        </button>
      ) : (
        <div className="resumen-cab" style={{ cursor: 'default' }}><span>{t('rec.nFases', { n: steps.length })}</span></div>
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
                {describirFase(p)}
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
  const { t } = useIdioma();
  const S = useSyncExternalStore(ses.suscribir, ses.leer, ses.leerEnServidor);
  const hoy = todayLocal();
  const delDia = pendientes.filter((p) => p.date === hoy);
  const otros = pendientes.filter((p) => p.date !== hoy && !p.completed);
  const inicial = delDia.find((p) => !p.completed) ?? delDia[0] ?? null;

  const [elegido, setElegido] = useState<Pendiente | null>(inicial);
  const [libre, setLibre] = useState(false);
  const [sonido, setSonido] = useState(true);
  // El deporte lo propone el entrenamiento asignado, pero manda el atleta: si
  // le mandas un rodaje y acaba caminando, que quede como caminata.
  const [tocado, setTocado] = useState(false);
  const [deporte, setDeporte] = useState<string>(deporteDe(inicial?.type));

  const enMarcha = S.estado !== 'idle';
  const previo = libre ? null : elegido;
  // Antes de empezar mandan las fases del entrenamiento elegido; una vez en
  // marcha manda lo que guarda el motor, que es lo que se está corriendo.
  const steps: Step[] = enMarcha ? S.steps : (previo?.phases ? expand(previo.phases, nombresPorDefecto()) : []);
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

  // Al cambiar de entrenamiento se reajusta el deporte, salvo que el atleta ya
  // lo haya elegido a mano: ahí manda él.
  function elegir(p: Pendiente | null) {
    setElegido(p); setLibre(p === null);
    if (!tocado) setDeporte(deporteDe(p?.type));
  }

  const deporteActual = enMarcha ? S.deporte : deporte;

  function empezar() {
    ses.iniciar({
      workoutId: previo?.id ?? null,
      titulo: previo?.title ?? nombreDeporte(deporte),
      deporte,
      steps, fases, sonido, subirStrava: hasStrava,
    });
  }

  return (
    <div>
      {S.estado === 'idle' && (delDia.length > 0 || otros.length > 0) && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t('grabar.queHacer')}</div>
          {[...delDia, ...otros].map((p) => {
            const sel = !libre && elegido?.id === p.id;
            const fecha = new Date(p.date + 'T12:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' });
            return (
              <button key={p.id} onClick={() => elegir(p)} className={`elige ${sel ? 'on' : ''}`}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{DEPORTE_ICONO[deporteDe(p.type)] ?? ''} {p.title} {p.completed && <span className="muted" style={{ fontWeight: 400 }}>· {t('grabar.yaMarcado')}</span>}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {p.date === hoy ? t('grabar.hoy') : fecha}
                  {p.phases?.length ? ` · ${t('grabar.fases', { n: expand(p.phases).length })}` : p.target_distance_km ? ` · ${p.target_distance_km} km` : ''}
                </div>
              </button>
            );
          })}
          <button onClick={() => elegir(null)} className={`elige ${libre ? 'on' : ''}`}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t('grabar.libre')}</div>
            <div className="muted" style={{ fontSize: 13 }}>{t('grabar.sinAsignar')}</div>
          </button>
        </div>
      )}

      {S.estado === 'idle' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{t('grabar.comoHacer')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {GRABABLES.map((d) => (
              <button key={d} onClick={() => { setDeporte(d); setTocado(true); }}
                className={`elige ${deporte === d ? 'on' : ''}`}
                style={{ flex: 1, textAlign: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: 20, lineHeight: 1.1 }}>{DEPORTE_ICONO[d]}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{nombreDeporte(d)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {enMarcha && (
        <div className="card" style={{ marginBottom: 12 }}>
          <span className="pill">{t(S.estado === 'paused' ? 'grabar.enPausa' : S.estado === 'running' ? 'grabar.enMarcha' : 'grabar.terminada')}</span>{' '}
          <b>{DEPORTE_ICONO[deporteActual] ?? ''} {S.titulo}</b>
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
              {S.hr >= zonaObjetivo.min && S.hr <= zonaObjetivo.max ? `✓ ${t('rec.enZona')}` : S.hr > zonaObjetivo.max ? `▲ ${t('rec.pulsoAlto')}` : `▼ ${t('rec.pulsoBajo')}`} · {S.hr} ppm
            </div>
          )}
          {(S.estado === 'running' || S.estado === 'paused') && (
            <button className="btn ghost block" style={{ marginTop: 10, padding: '6px 12px', fontSize: 13 }} onClick={ses.saltarFase}>{t('rec.saltarFase')}</button>
          )}
        </div>
      )}

      {steps.length > 0 && S.estado !== 'idle' && idx >= steps.length && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--verde-txt)', borderWidth: 2 }}>
          <b>{t('rec.completado')}</b>
          <div className="muted" style={{ fontSize: 14 }}>{t('rec.completadoDesc')}</div>
        </div>
      )}

      <ListaFases fases={fases} steps={steps} idx={idx} activa={enMarcha} />

      <div className="rec-map"><RunMap points={S.pts} /></div>

      <div className="metrics">
        <div className="metric"><b>{(S.dist / 1000).toFixed(2)}</b><small>km</small></div>
        <div className="metric"><b>{fmtTime(S.elapsed)}</b><small>{t('rec.tiempo')}</small></div>
        <div className="metric"><b>{fmtPace(pace)}</b><small>min/km</small></div>
      </div>

      {S.hr && (
        <div className="metric" style={{ marginBottom: 10, borderColor: zonaActual?.color ?? 'var(--line)' }}>
          <b style={{ color: zonaActual?.color }}>{S.hr}</b>
          <small>ppm {zonaActual ? t('rec.zonaPpm', { n: zonaActual.n, nombre: nombreZona(zonaActual.n) }) : ''}</small>
        </div>
      )}

      {(S.estado === 'running' || S.estado === 'paused') && S.gpsAcc != null && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: -4 }}>
          {t('rec.precision', { m: S.gpsAcc })} {S.gpsAcc > 25 ? t('rec.senalDebil') : ''}
        </p>
      )}

      <div className="rec-actions">
        {S.estado === 'idle' && <>
          <label className="check">
            <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} />
            {t('rec.avisosVoz')}
          </label>
          {bleDisponible() && (
            <button className="btn ghost block" onClick={ses.conectarSensor}>
              {S.sensor ? t('rec.sensor', { n: S.sensor }) : t('rec.conectarPulso')}
            </button>
          )}
          <button className="btn go block" onClick={empezar}>
            {steps.length ? t('rec.iniciarEntreno', { n: steps.length }) : t('rec.iniciarLibre')}
          </button>
        </>}

        {S.estado === 'running' && <button className="btn block" onClick={ses.pausar}>{t('rec.pausar')}</button>}

        {S.estado === 'paused' && <>
          <button className="btn go block" onClick={ses.continuar}>{t('rec.continuar')}</button>
          <button className="btn stop block" onClick={ses.terminar}>{t('rec.terminar')}</button>
        </>}

        {S.estado === 'done' && <>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{t('rec.comoSintio')}</div>
            <div className="rpe">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button key={n} className={S.rpe === n ? 'on' : ''} onClick={() => ses.ponerRpe(S.rpe === n ? null : n)}>{n}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 13, minHeight: 18 }}>{S.rpe ? `${S.rpe} · ${nombreRpe(S.rpe)}` : t('rec.rpeVacio')}</div>
            <div className="field" style={{ marginTop: 10 }}>
              <textarea rows={2} value={S.notas} onChange={(e) => ses.ponerNotas(e.target.value)} placeholder={t('rec.notasPista')} />
            </div>
            {hasStrava && (
              <label className="check">
                <input type="checkbox" checked={S.subirStrava} onChange={(e) => ses.ponerStrava(e.target.checked)} />
                {t('rec.subirStrava')}
              </label>
            )}
          </div>
          <button className="btn flare block" onClick={() => ses.guardar(hasStrava)} disabled={S.pts.length < 2}>
            {hasStrava && S.subirStrava ? t('rec.guardarStrava') : t('rec.guardarSolo')}
          </button>
          <button className="btn ghost block" onClick={() => { if (confirm(t('rec.descartarPregunta'))) ses.descartar(); }}>{t('rec.descartar')}</button>
        </>}

        {S.estado === 'saving' && <button className="btn block" disabled>{t('rec.guardando')}</button>}

        {S.estado === 'saved' && <>
          <Link className="btn block" href="/activities">{t('rec.verActividades')}</Link>
          <button className="btn ghost block" onClick={ses.descartar}>{t('rec.grabarOtra')}</button>
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
