'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import PushToggle from './PushToggle';
import AvatarUpload from './AvatarUpload';

export default function Settings({ me, email }: { me: { id: string; full_name: string | null; role: string; strava_athlete_id: number | null; coach_id: string | null; avatar_url?: string | null }; email?: string }) {
  const r = useRouter();
  const [name, setName] = useState(me.full_name ?? ''); const [code, setCode] = useState(me.coach_id ?? '');
  const [pass, setPass] = useState(''); const [msg, setMsg] = useState(''); const [pmsg, setPmsg] = useState('');
  const [smsg, setSmsg] = useState('');

  async function save() {
    setMsg('Guardando…');
    const res = await fetch('/api/coach/link', { method: 'POST', body: JSON.stringify({ full_name: name, coach_code: code.trim() }) });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? 'Guardado.' : (j.error ?? 'No se pudo guardar.'));
    r.refresh();
  }
  async function setPassword() {
    const { error } = await supabaseBrowser().auth.updateUser({ password: pass });
    setPmsg(error ? error.message : 'Contraseña guardada. Ya puedes entrar desde cualquier dispositivo.'); setPass('');
  }
  async function disconnectStrava() {
    if (!confirm('¿Desconectar Strava? Dejarán de llegar tus carreras automáticamente. Las que ya están guardadas se quedan.')) return;
    setSmsg('Desconectando…');
    const res = await fetch('/api/strava/disconnect', { method: 'POST' });
    setSmsg(res.ok ? 'Strava desconectado.' : 'No se pudo desconectar.'); r.refresh();
  }
  async function out() { await supabaseBrowser().auth.signOut(); location.href = '/'; }

  return (
    <div className="card">
      <AvatarUpload userId={me.id} url={me.avatar_url} name={me.full_name} />
      {email && <p className="muted" style={{ marginTop: 0 }}>{email}</p>}
      <div className="field"><label>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>Código de entrenador</label><input value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder="Pega aquí el código de tu coach" /></div>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn block" onClick={save}>Guardar</button>

      <h2>Contraseña</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>Ponte una contraseña para entrar en el teléfono sin depender del correo.</p>
      <div className="field"><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Nueva contraseña (mín. 6)" autoComplete="new-password" /></div>
      {pmsg && <p className="muted">{pmsg}</p>}
      <button className="btn block" onClick={setPassword} disabled={pass.length < 6}>Guardar contraseña</button>

      <PushToggle />

      <h2>Strava</h2>
      {me.strava_athlete_id ? (
        <>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>Conectado (atleta {me.strava_athlete_id}). Las carreras nuevas llegan solas.</p>
          {smsg && <p className="muted">{smsg}</p>}
          <button className="btn ghost block" onClick={disconnectStrava}>Desconectar Strava</button>
        </>
      ) : (
        <>
          {smsg && <p className="muted">{smsg}</p>}
          <a className="btn block" style={{ background: '#FC4C02', borderColor: '#FC4C02' }} href="/api/strava/connect">Conectar con Strava</a>
        </>
      )}

      <h2>Sesión</h2>
      <button className="btn ghost block" onClick={out}>Cerrar sesión</button>
    </div>
  );
}
