'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { haversine, type Point } from '@/lib/geo';
import { fmtPace, fmtTime } from '@/lib/format';
import { expand, type Phase, type Step, fmtPaceStr } from '@/lib/phases';
import { initAudio, beep, doubleBeep, phaseBeep, speak } from '@/lib/audio';

const RunMap = dynamic(() => import('./RunMap'), { ssr: false });
type Todays = { id: string; title: string; target_distance_km: number | null; target_pace: string | null; phases: Phase[] | null } | null;

export default function Recorder({ todays, hasStrava }: { todays: Todays; hasStrava: boolean }) {
  const steps: Step[] = todays?.phases ? expand(todays.phases) : [];
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'done' | 'saving' | 'saved'>('idle');
  const [pts, setPts] = useState<Point[]>([]);
  const [dist, setDist] = useState(0); const [elapsed, setElapsed] = useState(0); const [msg, setMsg] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [stepDist, setStepDist] = useState(0); const [stepTime, setStepTime] = useState(0);
  const [recentPace, setRecentPace] = useState(0);
  const [sound, setSound] = useState(true);

  const watch = useRef<number | null>(null); const timer = useRef<number | null>(null);
  const lock = useRef<any>(null); const last = useRef<Point | null>(null);
  const lastKm = useRef(0); const soundOn = useRef(true);
  const d = useRef({ dist: 0, stepDist: 0, stepTime: 0, elapsed: 0, idx: 0 });
  const recent = useRef<Point[]>([]);

  const step: Step | undefined = steps[d.current.idx] ?? steps[stepIdx];
  const stepTarget = step ? (step.mode === 'distance' ? step.meters ?? 0 : step.seconds ?? 0) : 0;
  const stepDone = step ? (step.mode === 'distance' ? stepDist : stepTime) : 0;
  const stepPct = stepTarget ? Math.min(100, (stepDone / stepTarget) * 100) : 0;

  function announceStep(i: number) {
    const s = steps[i];
    if (!s) return;
    const what = s.mode === 'distance'
      ? (s.meters! >= 1000 ? `${(s.meters! / 1000).toFixed(1)} kilómetros` : `${s.meters} metros`)
      : `${Math.round((s.seconds ?? 0) / 60)} minutos`;
    const pace = s.paceLow || s.paceHigh ? `, ritmo ${fmtPaceStr(s.paceLow || s.paceHigh)}` : '';
    if (soundOn.current) { phaseBeep(); setTimeout(() => speak(`${s.name}. ${what}${pace}`), 700); }
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
    const c = pos.coords; if (c.accuracy > 40) return;
    const p: Point = { lat: c.latitude, lng: c.longitude, t: pos.timestamp, alt: c.altitude ?? undefined };
    if (last.current) {
      const delta = haversine(last.current, p);
      if (delta < 3) return;
      d.current.dist += delta; setDist(d.current.dist);

      // Ritmo de los últimos ~30 s
      recent.current.push(p);
      recent.current = recent.current.filter((x) => p.t - x.t < 30000);
      if (recent.current.length > 2) {
        let rd = 0;
        for (let i = 1; i < recent.current.length; i++) rd += haversine(recent.current[i - 1], recent.current[i]);
        const rt = (p.t - recent.current[0].t) / 1000;
        setRecentPace(rd > 20 ? rt / (rd / 1000) : 0);
      }

      // Aviso por kilómetro
      const km = Math.floor(d.current.dist / 1000);
      if (km > lastKm.current) {
        lastKm.current = km;
        const pace = d.current.elapsed / (d.current.dist / 1000);
        if (soundOn.current) { doubleBeep(); setTimeout(() => speak(`Kilómetro ${km}. Ritmo medio ${fmtPaceStr(pace).replace(':', ' ')}`), 500); }
      }

      // Progreso de la fase
      if (steps.length && d.current.idx < steps.length) {
        d.current.stepDist += delta; setStepDist(d.current.stepDist);
        const s = steps[d.current.idx];
        if (s.mode === 'distance' && d.current.stepDist >= (s.meters ?? 0)) advance();
      }
    }
    last.current = p; setPts((a) => [...a, p]);
  }

  function start() {
    if (!('geolocation' in navigator)) { setMsg('Este navegador no tiene GPS.'); return; }
    if (sound) { initAudio(); soundOn.current = true; } else soundOn.current = false;
    setState('running');
    (navigator as any).wakeLock?.request('screen').then((l: any) => (lock.current = l)).catch(() => {});
    watch.current = navigator.geolocation.watchPosition(onPosition,
      (e) => setMsg(e.code === 1 ? 'Permite el acceso a la ubicación en los ajustes del navegador.' : 'Buscando señal GPS…'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    timer.current = window.setInterval(onTick, 1000);
    if (steps.length && d.current.elapsed === 0) announceStep(0);
  }
  function pause() {
    if (timer.current) clearInterval(timer.current);
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    last.current = null; recent.current = []; setState('paused'); beep(440, 0.15);
  }
  function stop() { pause(); lock.current?.release?.(); setState('done'); }
  function skipStep() { if (d.current.idx < steps.length) advance(); }

  async function save() {
    setState('saving');
    const name = todays?.title ?? 'Carrera';
    const r = await fetch('/api/strava/upload', { method: 'POST', body: JSON.stringify({ points: pts, name, workoutId: todays?.id, movingTime: elapsed }) });
    const j = await r.json();
    setMsg(r.ok ? (hasStrava ? `Guardado. Strava: ${j.uploadStatus}` : 'Guardado en tu plan. Conecta Strava para subirlo allí también.') : 'No se pudo guardar. Revisa la conexión.');
    setState('saved');
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (watch.current != null) navigator.geolocation.clearWatch(watch.current); }, []);

  const pace = dist > 0 ? elapsed / (dist / 1000) : 0;
  const onTarget = step?.paceLow && step?.paceHigh && recentPace
    ? recentPace < step.paceLow ? 'rápido' : recentPace > step.paceHigh ? 'lento' : 'en ritmo' : null;

  return (
    <div>
      {todays && (
        <div className="card" style={{ marginBottom: 12 }}>
          <span className="pill">Hoy</span> <b>{todays.title}</b>
          {!steps.length && <div className="muted" style={{ fontSize: 14 }}>{todays.target_distance_km ? `${todays.target_distance_km} km` : ''}{todays.target_pace ? ` · ${todays.target_pace} /km` : ''}</div>}
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
              </div>
              <div style={{ height: 8, background: 'var(--bg)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stepPct}%`, background: 'var(--flare)', transition: 'width .3s' }} />
              </div>
              {onTarget && (
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14, color: onTarget === 'en ritmo' ? 'var(--go)' : 'var(--flare-ink)' }}>
                  {onTarget === 'en ritmo' ? '✓ En ritmo' : onTarget === 'rápido' ? '▲ Vas rápido, afloja' : '▼ Vas lento, aprieta'} · {fmtPace(recentPace)} /km
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

      <div className="rec-actions">
        {state === 'idle' && <>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 4 }}>
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} style={{ width: 18, height: 18 }} />
            Avisos por voz y sonido
          </label>
          <button className="btn go block" onClick={start}>Empezar</button>
        </>}
        {state === 'running' && <button className="btn block" onClick={pause}>Pausar</button>}
        {state === 'paused' && <><button className="btn go block" onClick={start}>Continuar</button><button className="btn flare block" onClick={stop}>Terminar</button></>}
        {state === 'done' && <><button className="btn flare block" onClick={save} disabled={pts.length < 2}>Guardar{hasStrava ? ' y subir a Strava' : ''}</button><button className="btn ghost block" onClick={() => location.reload()}>Descartar</button></>}
        {state === 'saving' && <button className="btn block" disabled>Guardando…</button>}
        {state === 'saved' && <a className="btn block" href="/athlete">Ver mi plan</a>}
      </div>

      {msg && <p className="notice" style={{ marginTop: 12 }}>{msg}</p>}
      {state === 'idle' && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Mantén la pantalla encendida mientras grabas: con la pantalla bloqueada el navegador detiene el GPS (sobre todo en iPhone). Si prefieres correr solo con el reloj, descarga el entrenamiento en formato Garmin desde tu plan.</p>}
    </div>
  );
}
