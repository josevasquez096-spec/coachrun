'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Footer from './Footer';

type Mode = 'signin' | 'signup' | 'magic';

export default function LoginForm({ inviteCoachId, inviteCoachName, sesionRota }: { inviteCoachId?: string; inviteCoachName?: string; sesionRota?: boolean }) {
  const [mode, setMode] = useState<Mode>(inviteCoachId ? 'signup' : 'signin');
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [name, setName] = useState(''); const [coach, setCoach] = useState(inviteCoachId ?? '');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setMsg(''); setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        location.href = '/';
      } else if (mode === 'signup') {
        const { error } = await sb.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name, coach_code: coach }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        const { data } = await sb.auth.getSession();
        if (data.session) {
          if (coach) {
            const link = await fetch('/api/coach/link', { method: 'POST', body: JSON.stringify({ full_name: name, coach_code: coach.trim() }) });
            if (!link.ok) { /* el guard lo reintenta al entrar, no bloqueamos el registro */ }
          }
          location.href = '/';
        } else setMsg('Cuenta creada. Revisa tu correo para confirmarla y luego entra con tu contraseña.');
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email, options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { full_name: name, coach_code: coach } },
        });
        if (error) throw error;
        setMsg('Te enviamos un enlace al correo.');
      }
    } catch (e: any) {
      setErr(e?.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.'
        : e?.message?.includes('rate limit') ? 'Demasiados correos seguidos. Espera un rato o entra con contraseña.'
        : e?.message === 'User already registered' ? 'Ya existe una cuenta con ese correo. Entra desde la pestaña «Entrar».'
        : e?.message ?? 'Algo falló.');
    }
    setBusy(false);
  }

  const tab = (m: Mode, label: string) => (
    <button onClick={() => { setMode(m); setErr(''); setMsg(''); }}
      style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 14,
        background: mode === m ? 'var(--ink)' : 'transparent', color: mode === m ? '#fff' : 'var(--ink-2)' }}>{label}</button>
  );

  return (
    <main className="shell" style={{ paddingTop: 48 }}>
      <div className="brand" style={{ fontSize: 34 }}>Coach<span>Run</span></div>
      <p className="muted" style={{ marginTop: 4 }}>Tu entrenador te pone el plan. Tú sales a correr.</p>

      {sesionRota && (
        <div className="notice" style={{ marginTop: 20, fontSize: 14 }}>
          Tu sesión quedó a medias. Entra otra vez con tu correo y contraseña.{' '}
          <button onClick={async () => { await supabaseBrowser().auth.signOut(); location.href = '/'; }}
            style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            Limpiar sesión
          </button>
        </div>
      )}

      {inviteCoachName && (
        <div className="notice" style={{ marginTop: 20, fontSize: 15 }}>
          <b>{inviteCoachName}</b> te invita a entrenar. Crea tu cuenta y quedarás en su grupo.
        </div>
      )}

      <div className="card" style={{ marginTop: inviteCoachName ? 12 : 28 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 999, padding: 4, marginBottom: 16 }}>
          {tab('signin', 'Entrar')}{tab('signup', 'Crear cuenta')}{tab('magic', 'Sin contraseña')}
        </div>

        {mode === 'signup' && (
          <>
            <div className="field"><label>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te llama tu entrenador" /></div>
            {!inviteCoachId && (
              <div className="field"><label>Código de entrenador (opcional)</label>
                <input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="Te lo pasa tu coach" /></div>
            )}
          </>
        )}

        <div className="field"><label>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" /></div>

        {mode !== 'magic' && (
          <div className="field"><label>Contraseña</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" /></div>
        )}

        {err && <p className="notice">{err}</p>}
        {msg && <p className="muted" style={{ fontSize: 14 }}>{msg}</p>}

        <button className="btn flare block" onClick={submit} disabled={busy || !email || (mode !== 'magic' && pass.length < 6)}>
          {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>

        {mode === 'signin' && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            ¿Entraste antes con enlace mágico? Crea una contraseña desde «Cuenta» para poder entrar en cualquier dispositivo.
          </p>
        )}
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>Para instalarla: en el navegador toca «Compartir» → «Añadir a pantalla de inicio».</p>
      <Footer />
    </main>
  );
}
