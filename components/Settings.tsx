'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Settings({ me }: { me: { full_name: string | null; role: string; strava_athlete_id: number | null; coach_id: string | null } }) {
  const r = useRouter(); const [name, setName] = useState(me.full_name ?? ''); const [code, setCode] = useState(me.coach_id ?? ''); const [msg, setMsg] = useState('');
  async function save() {
    const res = await fetch('/api/coach/link', { method: 'POST', body: JSON.stringify({ full_name: name, coach_code: code }) });
    setMsg(res.ok ? 'Guardado' : 'No se encontró ese código de entrenador'); r.refresh();
  }
  async function out() { await supabaseBrowser().auth.signOut(); location.href = '/'; }
  return (
    <div className="card">
      <div className="field"><label>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>Código de entrenador</label><input value={code} onChange={(e) => setCode(e.target.value)} /></div>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn block" onClick={save}>Guardar</button>
      <h2>Strava</h2>
      {me.strava_athlete_id ? <p className="muted">Conectado (atleta {me.strava_athlete_id}). Las carreras nuevas llegan solas.</p> : <a className="btn block" style={{ background: '#FC4C02', borderColor: '#FC4C02' }} href="/api/strava/connect">Conectar con Strava</a>}
      <h2>Sesión</h2>
      <button className="btn ghost block" onClick={out}>Cerrar sesión</button>
    </div>
  );
}
