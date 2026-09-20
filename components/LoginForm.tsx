'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Footer from './Footer';
import { pedir, motivoDeFallo, dominioPublico, enLaApp } from '@/lib/api';

type Mode = 'signin' | 'signup' | 'magic' | 'olvide';

export default function LoginForm({ inviteCoachId, inviteCoachName, sesionRota, fallo }: { inviteCoachId?: string; inviteCoachName?: string; sesionRota?: boolean; fallo?: string }) {
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
          options: { data: { full_name: name, coach_code: coach }, emailRedirectTo: `${dominioPublico()}/auth/callback` },
        });
        if (error) throw error;
        const { data } = await sb.auth.getSession();
        if (data.session) {
          if (coach) {
            const link = await pedir('/api/coach/link', { method: 'POST', body: JSON.stringify({ full_name: name, coach_code: coach.trim() }) });
            if (!link.ok) { /* el guard lo reintenta al entrar, no bloqueamos el registro */ }
          }
          location.href = '/';
        } else setMsg('Cuenta creada. Revisa tu correo para confirmarla y luego entra con tu contraseña.');
      } else if (mode === 'olvide') {
        // Manda un correo con un enlace que abre la sesión y lleva derecho a
        // Cuenta, donde está el campo para ponerse una contraseña nueva.
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${dominioPublico()}/auth/callback?next=/athlete/settings`,
        });
        if (error) throw error;
        setMsg('Te mandamos un correo. Ábrelo desde este mismo teléfono y te llevará a ponerte una contraseña nueva. Si no llega en unos minutos, mira en la carpeta de correo no deseado.');
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email, options: { emailRedirectTo: `${dominioPublico()}/auth/callback`, data: { full_name: name, coach_code: coach } },
        });
        if (error) throw error;
        setMsg('Te enviamos un enlace al correo.');
      }
    } catch (e: any) {
      setErr(e?.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.'
        : e?.message?.includes('rate limit') ? 'Demasiados correos seguidos. Espera un rato o entra con contraseña.'
        : e?.message === 'User already registered' ? 'Ya existe una cuenta con ese correo. Entra desde la pestaña «Entrar».'
        : motivoDeFallo(e));
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
      <div className="brand" style={{ fontSize: 34 }}>MyCoach<span>Runs</span></div>
      <p className="muted" style={{ marginTop: 4 }}>Tu entrenador te pone el plan. Tú sales a correr.</p>

      {fallo && (
        <div className="notice mal" style={{ marginTop: 20, fontSize: 14 }}>
          <b>No se pudo comprobar tu sesión.</b><br />{fallo}
        </div>
      )}

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

        {mode !== 'magic' && mode !== 'olvide' && (
          <div className="field"><label>Contraseña</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" /></div>
        )}

        {err && <p className="notice mal">{err}</p>}
        {msg && <p className="muted" style={{ fontSize: 14 }}>{msg}</p>}

        <button className="btn flare block" onClick={submit}
          disabled={busy || !email || (mode !== 'magic' && mode !== 'olvide' && pass.length < 6)}>
          {busy ? 'Un momento…'
            : mode === 'signin' ? 'Entrar'
            : mode === 'signup' ? 'Crear cuenta'
            : mode === 'olvide' ? 'Mandarme el correo'
            : 'Enviar enlace'}
        </button>

        {mode === 'signin' && (
          <button onClick={() => { setMode('olvide'); setErr(''); setMsg(''); }}
            style={{ background: 'none', border: 'none', width: '100%', marginTop: 12, padding: 0,
              color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
            Olvidé mi contraseña
          </button>
        )}
        {mode === 'olvide' && (
          <>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
              El correo tarda un par de minutos. Solo se pueden mandar unos pocos por hora.
            </p>
            <button onClick={() => { setMode('signin'); setErr(''); setMsg(''); }}
              style={{ background: 'none', border: 'none', width: '100%', marginTop: 6, padding: 0,
                color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
              Volver a entrar con contraseña
            </button>
          </>
        )}

      </div>

      {/* Dentro del APK la app ya está instalada: el consejo sobraba. */}
      {!enLaApp() && <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>Para instalarla: en el navegador toca «Compartir» → «Añadir a pantalla de inicio».</p>}
      <Footer />
    </main>
  );
}
