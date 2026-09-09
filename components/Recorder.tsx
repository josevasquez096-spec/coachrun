'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { acumular, distanciaTotal, type Point } from '@/lib/geo';
import { fmtPace, fmtTime, todayLocal } from '@/lib/format';
import { expand, type Phase, type Step, fmtPaceStr } from '@/lib/phases';
import { initAudio, beep, doubleBeep, phaseBeep, speak } from '@/lib/audio';
import { zonas, zonaDe, RPE_LABEL, type Zona } from '@/lib/zones';
import { bleDisponible, conectarPulso, type HrHandle } from '@/lib/ble';

const RunMap = dynamic(() => import('./RunMap'), { ssr: false });

type Pendiente = { id: string; date: string; title: string; target_distance_km: number | null; target_pace: string | null; phases: Phase[] | null; completed: boolean };
type Perfil = { max_hr: number | null; resting_hr: number | null };

export default function Recorder({ pendientes, hasStrava, perfil }: { pendientes: Pendiente[]; hasStrava: boolean; perfil?: Perfil }) {
  const hoy = todayLocal();
  const delDia = pendientes.filter((p) => p.date === hoy);
  const otros = pendientes.filter((p) => p.date !== hoy && !p.completed);
  const inicial = delDia.find((p) => !p.completed) ?? delDia[0] ?? null;

  const [elegido, setElegido] = useState<Pendiente | null>(inicial);
  const [libre, setLibre] = useState(false);
  const todays = libre ? null : elegido;
  const steps: Step[] = todays?.phases ? expand(todays.phases) : [];

  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'done' | 'saving' | 'saved'>('idle');
  const [pts, setPts] = useState<Point[]>([]);
  const [dist, setDist] = useState(0); const [elapsed, setElapsed] = useState(0); const [msg, setMsg] = useState('');
  const [gpsAcc, setGpsAcc] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepDist, setStepDist] = useState(0); const [stepTime, setStepTime] = useState(0);
  const [recentPace, setRecentPace] = useState(0);
  const [sound, setSound] = useState(true);
  const [subirStrava, setSubirStrava] = useState(hasStrava);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [hr, setHr] = useState<number | null>(null);
  const [sensor, setSensor] = useState<string | null>(null);

  const zs: Zona[] | null = zonas(perfil?.max_hr, perfil?.resting_hr);
  const watch = useRef<number | null>(null); const timer = useRef<number | null>(null);
  const lock = useRef<any>(null); const last = useRef<Point | null>(null);
  const pendienteM = useRef(0); const hrSum = useRef({ suma: 0, n: 0 }); const ble = useRef<HrHandle | null>(null);
  const lastKm = useRef(0); const soundOn = useRef(true);
  const d = useRef({ dist: 0, stepDist: 0, stepTime: 0, elapsed: 0, idx: 0 });
  const recent = useRef<Point[]>([]);

  const step: Step | undefined = steps[stepIdx];
  const stepTarget = step ? (step.mode === 'distance' ? step.meters ?? 0 : step.seconds ?? 0) : 0;
  const stepDone = step ? (step.mode === 'distance' ? stepDist : stepTime) : 0;
  const stepPct = stepTarget ? Math.min(100, (stepDone / stepTarget) * 100) : 0;
  const zonaActual = hr ? zonaDe(hr, zs) : null;

  function announceStep(i: number) {
    const s = steps[i];
    if (!s) return;
    const what = s.mode === 'distance'
      ? (s.meters! >= 1000 ? `${(s.meters! / 1000).toFixed(1)} kilómetros` : `${s.meters} metros`)
      : `${Math.round((s.seconds ?? 0) / 60)} minutos`;
    const obj = s.paceLow || s.paceHigh ? `, ritmo ${fmtPaceStr(s.paceLow || s.paceHigh)}` : s.hrZone ? `, zona ${s.hrZone}` : '';
    if (soundOn.current) { phaseBeep(); setTimeout(() => speak(`${s.name}. ${what}${obj}`), 700); }
  }

  function advance() {
    const next = d.current.idx + 1;
    d.current.idx = next; d.current.stepDist = 0; d.current.stepTime = 0;
    setStepIdx(next); setStepDist(0); setStepTime(0);
    if (next < steps.length) announceStep(next);
    else if (soundOn.current) { phaseBeep(); setTimeout(() => speak('Entrenamiento completado. Buen trabajo.'), 700); }
  }

  function onTick() {
    d.current.elapsed += 1; setElapsed(d.current.elapsed);
    if (steps.length && d.current.idx < steps.length) {
      d.current.stepTime += 1; setStepTime(d.current.stepTime);
      const s = steps[d.current.idx];
      if (s.mode === 'time' && d.current.stepTime >= (s.seconds ?? 0)) advance();
    }
  }

  function onPosition(pos: GeolocationPosition) {
    const c = pos.coords;
    setGpsAcc(Math.round(c.accuracy));
    if (c.accuracy > 50) return;                            // señal demasiado pobre
    const p: Point = { lat: c.latitude, lng: c.longitude, t: pos.timestamp, alt: c.altitude ?? undefined, acc: c.accuracy };

    const { suma, pendiente, aceptar } = acumular(last.current, p, pendienteM.current);
    pendienteM.current = pendiente;

    if (suma > 0) {
      d.current.dist += suma; setDist(d.current.dist);

      // Ritmo de los últimos 30 s
      recent.current.push(p);
      recent.current = recent.current.filter((x) => p.t - x.t < 30000);
      if (recent.current.length > 2) {
        let rd = 0;
        for (let i = 1; i < recent.current.length; i++) rd += Math.abs(distanciaTotal([recent.current[i - 1], recent.current[i]]));
        const rt = (p.t - recent.current[0].t) / 1000;
        setRecentPace(rd > 20 ? rt / (rd / 1000) : 0);
      }

      // Aviso de kilómetro: siempre, con o sin entrenamiento asignado
      const km = Math.floor(d.current.dist / 1000);
      if (km > lastKm.current) {
        lastKm.current = km;
        const pace = d.current.elapsed / (d.current.dist / 1000);
        if (soundOn.current) {
          doubleBeep();
          const extra = hr ? `. Pulso ${hr}` : '';
          setTimeout(() => speak(`Kilómetro ${km}. Ritmo medio ${fmtPaceStr(pace).replace(':', ' ')}${extra}`), 500);
        }
      }

      if (steps.length && d.current.idx < steps.length) {
        d.current.stepDist += suma; setStepDist(d.current.stepDist);
        const s = steps[d.current.idx];
        if (s.mode === 'distance' && d.current.stepDist >= (s.meters ?? 0)) advance();
      }
    }

    if (aceptar || !last.current) { last.current = p; setPts((a) => [...a, p]); }
  }

  function start() {
    if (!('geolocation' in navigator)) { setMsg('Este navegador no tiene GPS.'); return; }
    initAudio(); soundOn.current = sound;
    setState('running');
    (navigator as any).wakeLock?.request('screen').then((l: any) => (lock.current = l)).catch(() => {});
    watch.current = navigator.geolocation.watchPosition(onPosition,
      (e) => setMsg(e.code === 1 ? 'Permite el acceso a la ubicación en los ajustes del navegador.' : 'Buscando señal GPS…'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    timer.current = window.setInterval(onTick, 1000);
    if (steps.length && d.current.elapsed === 0) announceStep(0);
  }
  function pause() {
    if (timer.current) clearInterval(timer.current);
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    last.current = null; recent.current = []; pendienteM.current = 0;
    setState('paused'); beep(440, 0.15);
  }
  function stop() { pause(); lock.current?.release?.(); ble.current?.stop(); setState('done'); }
  function skipStep() { if (d.current.idx < steps.length) advance(); }

  async function conectarSensor() {
    try {
      const h = await conectarPulso((bpm) => { setHr(bpm); hrSum.current.suma += bpm; hrSum.current.n++; });
      ble.current = h; setSensor(h.nombre);
    } catch { setMsg('No se pudo conectar el sensor de pulso.'); }
  }

  async function save() {
    setState('saving');
    const name = todays?.title ?? 'Carrera';
    const media = hrSum.current.n ? Math.round(hrSum.current.suma / hrSum.current.n) : null;
    try {
      const r = await fetch('/api/strava/upload', { method: 'POST', body: JSON.stringify({
        points: pts, name, workoutId: todays?.id, movingTime: elapsed,
        subirStrava: hasStrava && subirStrava, rpe, notas: notas || null, avgHr: media,
      }) });
      const j = await r.json();
      setMsg(!r.ok ? (j.error ?? 'No se pudo guardar.')
        : subirStrava && hasStrava ? `Guardado. Strava: ${j.uploadStatus}` : 'Guardado en CoachRun.');
    } catch { setMsg('No se pudo guardar. Revisa la conexión.'); }
    setState('saved');
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    ble.current?.stop();
  }, []);

  const pace = dist > 0 ? elapsed / (dist / 1000) : 0;
  const onTarget = step?.paceLow && step?.paceHigh && recentPace
    ? recentPace < step.paceLow ? 'rápido' : recentPace > step.paceHigh ? 'lento' : 'en ritmo' : null;
  const zonaObjetivo = step?.hrZone && zs ? zs[step.hrZone - 1] : null;

  return (
    <div>
      {state === 'idle' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>¿Qué vas a hacer?</div>
          {[...delDia, ...otros].map((p) => {
            const sel = !libre && elegido?.id === p.id;
            const fecha = new Date(p.date + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
            return (
              <button key={p.id} onClick={() => { setElegido(p); setLibre(false); }} className={`elige ${sel ? 'on' : ''}`}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title} {p.completed && <span className="muted" style={{ fontWeight: 400 }}>· ya marcado</span>}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {p.date === hoy ? 'Hoy' : fecha}
                  {p.phases?.length ? ` · ${expand(p.phases).length} fases` : ''}
                  {p.target_distance_km ? ` · ${p.target_distance_km} km` : ''}
                </div>
              </button>
            );
          })}
          <button onClick={() => setLibre(true)} className={`elige ${libre ? 'on' : ''}`}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Carrera libre</div>
            <div className="muted" style={{ fontSize: 13 }}>Sin entrenamiento asignado</div>
          </button>
          {!pendientes.length && <p className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>Tu entrenador no te ha asignado nada para estos días.</p>}
        </div>
      )}

      {steps.length > 0 && state !== 'idle' && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--flare)', borderWidth: 2 }}>
          {step ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <b style={{ fontSize: 18 }}>{step.name}</b>
                <span className="muted" style={{ fontSize: 13 }}>Fase {stepIdx + 1} de {steps.length}</span>
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
                {step.mode === 'distance'
                  ? `${(stepDist / 1000).toFixed(2)} / ${((step.meters ?? 0) / 1000).toFixed(2)} km`
                  : `${fmtTime(stepTime)} / ${fmtTime(step.seconds ?? 0)}`}
                {step.paceLow && step.paceHigh ? ` · objetivo ${fmtPaceStr(step.paceLow)}–${fmtPaceStr(step.paceHigh)}` : ''}
                {zonaObjetivo ? ` · zona ${zonaObjetivo.n} (${zonaObjetivo.min}–${zonaObjetivo.max} ppm)` : ''}
              </div>
              <div style={{ height: 8, background: 'var(--bg)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stepPct}%`, background: 'var(--flare)', transition: 'width .3s' }} />
              </div>
              {onTarget && (
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14, color: onTarget === 'en ritmo' ? 'var(--go)' : 'var(--flare-ink)' }}>
                  {onTarget === 'en ritmo' ? '✓ En ritmo' : onTarget === 'rápido' ? '▲ Vas rápido, afloja' : '▼ Vas lento, aprieta'} · {fmtPace(recentPace)} /km
                </div>
              )}
              {zonaObjetivo && hr && (
                <div style={{ marginTop: 6, fontWeight: 700, fontSize: 14, color: hr >= zonaObjetivo.min && hr <= zonaObjetivo.max ? 'var(--go)' : 'var(--flare-ink)' }}>
                  {hr >= zonaObjetivo.min && hr <= zonaObjetivo.max ? '✓ En zona' : hr > zonaObjetivo.max ? '▲ Pulso alto' : '▼ Pulso bajo'} · {hr} ppm
                </div>
              )}
              {(state === 'running' || state === 'paused') && (
                <button className="btn ghost block" style={{ marginTop: 10, padding: '6px 12px', fontSize: 13 }} onClick={skipStep}>Saltar a la siguiente fase</button>
              )}
            </>
          ) : <b style={{ fontSize: 18, color: 'var(--go)' }}>Entrenamiento completado ✓</b>}
        </div>
      )}

      <div className="rec-map"><RunMap points={pts} /></div>

      <div className="metrics">
        <div className="metric"><b>{(dist / 1000).toFixed(2)}</b><small>km</small></div>
        <div className="metric"><b>{fmtTime(elapsed)}</b><small>tiempo</small></div>
        <div className="metric"><b>{fmtPace(pace)}</b><small>min/km</small></div>
      </div>

      {hr && (
        <div className="metric" style={{ marginBottom: 10, borderColor: zonaActual?.color ?? 'var(--line)' }}>
          <b style={{ color: zonaActual?.color }}>{hr}</b>
          <small>ppm {zonaActual ? `· zona ${zonaActual.n} ${zonaActual.nombre}` : ''}</small>
        </div>
      )}

      {state !== 'idle' && state !== 'saved' && gpsAcc != null && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: -4 }}>
          Precisión GPS: ±{gpsAcc} m {gpsAcc > 25 ? '— señal débil, la distancia puede quedarse corta' : ''}
        </p>
      )}

      <div className="rec-actions">
        {state === 'idle' && <>
          <label className="check">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
            Avisos por voz y sonido en cada kilómetro
          </label>
          {bleDisponible() && (
            <button className="btn ghost block" onClick={conectarSensor}>
              {sensor ? `Sensor: ${sensor}` : 'Conectar cinturón de pulso'}
            </button>
          )}
          <button className="btn go block" onClick={start}>{steps.length ? `Comenzar entrenamiento (${steps.length} fases)` : 'Empezar carrera libre'}</button>
        </>}
        {state === 'running' && <button className="btn block" onClick={pause}>Pausar</button>}
        {state === 'paused' && <><button className="btn go block" onClick={start}>Continuar</button><button className="btn flare block" onClick={stop}>Terminar</button></>}

        {state === 'done' && <>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>¿Cómo se sintió?</div>
            <div className="rpe">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button key={n} className={rpe === n ? 'on' : ''} onClick={() => setRpe(rpe === n ? null : n)}>{n}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 13, minHeight: 18 }}>{rpe ? `${rpe} · ${RPE_LABEL[rpe]}` : 'Esfuerzo percibido (opcional)'}</div>
            <div className="field" style={{ marginTop: 10 }}>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas para tu entrenador (opcional)" />
            </div>
            {hasStrava && (
              <label className="check">
                <input type="checkbox" checked={subirStrava} onChange={(e) => setSubirStrava(e.target.checked)} />
                Subir también a Strava
              </label>
            )}
          </div>
          <button className="btn flare block" onClick={save} disabled={pts.length < 2}>
            {hasStrava && subirStrava ? 'Guardar y subir a Strava' : 'Guardar solo en CoachRun'}
          </button>
          <button className="btn ghost block" onClick={() => location.reload()}>Descartar</button>
        </>}
        {state === 'saving' && <button className="btn block" disabled>Guardando…</button>}
        {state === 'saved' && <a className="btn block" href="/activities">Ver mis actividades</a>}
      </div>

      {msg && <p className="notice" style={{ marginTop: 12 }}>{msg}</p>}
      {state === 'idle' && (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Deja la pantalla encendida y la app abierta: si el teléfono se bloquea o cambias de aplicación, el navegador corta el GPS y la distancia se queda corta.
          Para carreras largas es más fiable el reloj, y la actividad llegará sola desde Strava.
        </p>
      )}
    </div>
  );
}
