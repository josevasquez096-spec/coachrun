'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { haversine, type Point } from '@/lib/geo';
import { fmtPace, fmtTime } from '@/lib/format';

const RunMap = dynamic(() => import('./RunMap'), { ssr: false });
type Todays = { id: string; title: string; target_distance_km: number | null; target_pace: string | null } | null;

export default function Recorder({ todays, hasStrava }: { todays: Todays; hasStrava: boolean }) {
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'done' | 'saving' | 'saved'>('idle');
  const [pts, setPts] = useState<Point[]>([]);
  const [dist, setDist] = useState(0); const [elapsed, setElapsed] = useState(0); const [msg, setMsg] = useState('');
  const watch = useRef<number | null>(null); const timer = useRef<number | null>(null); const lock = useRef<any>(null); const last = useRef<Point | null>(null);

  async function start() {
    if (!('geolocation' in navigator)) { setMsg('Este navegador no tiene GPS.'); return; }
    setState('running');
    try { lock.current = await (navigator as any).wakeLock?.request('screen'); } catch {}
    watch.current = navigator.geolocation.watchPosition((pos) => {
      const c = pos.coords; if (c.accuracy > 40) return; // descarta puntos malos
      const p: Point = { lat: c.latitude, lng: c.longitude, t: pos.timestamp, alt: c.altitude ?? undefined };
      if (last.current) { const d = haversine(last.current, p); if (d < 3) return; setDist((x) => x + d); }
      last.current = p; setPts((a) => [...a, p]);
    }, (e) => setMsg(e.code === 1 ? 'Permite el acceso a la ubicación en los ajustes del navegador.' : 'Sin señal GPS todavía.'), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
  }
  function pause() { if (timer.current) clearInterval(timer.current); if (watch.current != null) navigator.geolocation.clearWatch(watch.current); last.current = null; setState('paused'); }
  function resume() { start(); }
  function stop() { pause(); lock.current?.release?.(); setState('done'); }
  async function save() {
    setState('saving');
    const name = todays?.title ? `${todays.title}` : 'Carrera';
    const r = await fetch('/api/strava/upload', { method: 'POST', body: JSON.stringify({ points: pts, name, workoutId: todays?.id, movingTime: elapsed }) });
    const j = await r.json();
    setMsg(r.ok ? (hasStrava ? `Guardado. Strava: ${j.uploadStatus}` : 'Guardado en tu plan. Conecta Strava para subirlo allí también.') : 'No se pudo guardar. Revisa la conexión y vuelve a intentarlo.');
    setState('saved');
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (watch.current != null) navigator.geolocation.clearWatch(watch.current); }, []);
  const pace = dist > 0 ? elapsed / (dist / 1000) : 0;

  return (
    <div>
      {todays && <div className="card" style={{ marginBottom: 12 }}><span className="pill">Hoy</span> <b>{todays.title}</b><div className="muted" style={{ fontSize: 14 }}>{[todays.target_distance_km && `${todays.target_distance_km} km`, todays.target_pace && `${todays.target_pace} /km`].filter(Boolean).join(' · ')}</div></div>}
      <div className="rec-map"><RunMap points={pts} /></div>
      <div className="metrics">
        <div className="metric"><b>{(dist / 1000).toFixed(2)}</b><small>km</small></div>
        <div className="metric"><b>{fmtTime(elapsed)}</b><small>tiempo</small></div>
        <div className="metric"><b>{fmtPace(pace)}</b><small>min/km</small></div>
      </div>
      <div className="rec-actions">
        {state === 'idle' && <button className="btn go block" onClick={start}>Empezar</button>}
        {state === 'running' && <button className="btn block" onClick={pause}>Pausar</button>}
        {state === 'paused' && <><button className="btn go block" onClick={resume}>Continuar</button><button className="btn flare block" onClick={stop}>Terminar</button></>}
        {state === 'done' && <><button className="btn flare block" onClick={save} disabled={pts.length < 2}>Guardar{hasStrava ? ' y subir a Strava' : ''}</button><button className="btn ghost block" onClick={() => location.reload()}>Descartar</button></>}
        {state === 'saving' && <button className="btn block" disabled>Guardando…</button>}
        {state === 'saved' && <a className="btn block" href="/athlete">Ver mi plan</a>}
      </div>
      {msg && <p className="notice" style={{ marginTop: 12 }}>{msg}</p>}
      {state === 'idle' && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Mantén la pantalla encendida mientras grabas: con la pantalla bloqueada el navegador detiene el GPS (sobre todo en iPhone). Si prefieres grabar con tu reloj o con Strava, la actividad llegará sola al plan.</p>}
    </div>
  );
}
