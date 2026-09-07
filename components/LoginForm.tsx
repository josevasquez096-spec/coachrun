'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginForm() {
  const [email, setEmail] = useState(''); const [name, setName] = useState(''); const [coach, setCoach] = useState('');
  const [sent, setSent] = useState(false); const [err, setErr] = useState('');
  async function send() {
    setErr('');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { full_name: name, coach_code: coach } },
    });
    if (error) setErr(error.message); else setSent(true);
  }
  return (
    <main className="shell" style={{ paddingTop: 48 }}>
      <div className="brand" style={{ fontSize: 34 }}>Coach<span>Run</span></div>
      <p className="muted" style={{ marginTop: 4 }}>Tu entrenador te pone el plan. Tú sales a correr.</p>
      {sent ? <div className="card" style={{ marginTop: 28 }}>Revisa tu correo: te enviamos un enlace para entrar.</div> : (
        <div className="card" style={{ marginTop: 28 }}>
          <div className="field"><label>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te llama tu entrenador" /></div>
          <div className="field"><label>Correo</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" /></div>
          <div className="field"><label>Código de entrenador (opcional)</label><input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="Te lo pasa tu coach" /></div>
          {err && <p className="notice">{err}</p>}
          <button className="btn flare block" onClick={send} disabled={!email}>Entrar con enlace mágico</button>
        </div>
      )}
      <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>Para instalarla: en el navegador toca «Compartir» → «Añadir a pantalla de inicio».</p>
    </main>
  );
}
