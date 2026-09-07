'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Settings({ me, email }: { me: { full_name: string | null; role: string; strava_athlete_id: number | null; coach_id: string | null }; email?: string }) {
  const r = useRouter();
  const [name, setName] = useState(me.full_name ?? ''); const [code, setCode] = useState(me.coach_id ?? '');
  const [pass, setPass] = useState(''); const [msg, setMsg] = useState(''); const [pmsg, setPmsg] = useState('');

  async function save() {
    const res = await fetch('/api/coach/link', { method: 'POST', body: JSON.stringify({ full_name: name, coach_code: code }) });
    setMsg(res.ok ? 'Guardado.' : 'No se encontró ese código de entrenador.'); r.refresh();
  }
  async function setPassword() {
    const { error } = await supabaseBrowser().auth.updateUser({ password: pass });
    setPmsg(error ? error.message : 'Contraseña guardada. Ya puedes entrar desde cualquier dispositivo.');
    setPass('');
  }
  async function out() { await supabaseBrowser().auth.signOut(); location.href = '/'; }

  return (
    <div className="card">
      {email && <p className="muted" style={{ marginTop: 0 }}>{email}</p>}
      <div className="field"><label>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>Código de entrenador</label><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Pega aquí el código de tu coach" /></div>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn block" onClick={save}>Guardar</button>

      <h2>Contraseña</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>Ponte una contraseña para entrar en el teléfono sin depender del correo.</p>
      <div className="field"><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Nueva contraseña (mín. 6)" autoComplete="new-password" /></div>
      {pmsg && <p className="muted">{pmsg}</p>}
      <button className="btn block" onClick={setPassword} disabled={pass.length < 6}>Guardar contraseña</button>

      <h2>Strava</h2>
      {me.strava_athlete_id
        ? <p className="muted">Conectado (atleta {me.strava_athlete_id}). Las carreras nuevas llegan solas.</p>
        : <a className="btn block" style={{ background: '#FC4C02', borderColor: '#FC4C02' }} href="/api/strava/connect">Conectar con Strava</a>}

      <h2>Sesión</h2>
      <button className="btn ghost block" onClick={out}>Cerrar sesión</button>
    </div>
  );
}
