'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Footer from './Footer';
import { pedir, motivoDeFallo, dominioPublico, enLaApp } from '@/lib/api';
import { useIdioma } from '@/lib/idioma';

type Mode = 'signin' | 'signup' | 'magic' | 'olvide';

export default function LoginForm({ inviteCoachId, inviteCoachName, sesionRota, fallo }: { inviteCoachId?: string; inviteCoachName?: string; sesionRota?: boolean; fallo?: string }) {
  const { t } = useIdioma();
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
        } else setMsg(t('entrar.revisaCorreo'));
      } else if (mode === 'olvide') {
        // Manda un correo con un enlace que abre la sesión y lleva derecho a
        // Cuenta, donde está el campo para ponerse una contraseña nueva.
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${dominioPublico()}/auth/callback?next=/athlete/settings`,
        });
        if (error) throw error;
        setMsg(t('entrar.recuperaEnviado'));
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email, options: { emailRedirectTo: `${dominioPublico()}/auth/callback`, data: { full_name: name, coach_code: coach } },
        });
        if (error) throw error;
        setMsg(t('entrar.enlaceEnviado'));
      }
    } catch (e: any) {
      setErr(e?.message === 'Invalid login credentials' ? t('entrar.malClave')
        : e?.message?.includes('rate limit') ? t('entrar.muchosCorreos')
        : e?.message === 'User already registered' ? t('entrar.yaExiste')
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
      <p className="muted" style={{ marginTop: 4 }}>{t('entrar.lema')}</p>

      {fallo && (
        <div className="notice mal" style={{ marginTop: 20, fontSize: 14 }}>
          <b>{t('entrar.noSesion')}</b><br />{fallo}
        </div>
      )}

      {sesionRota && (
        <div className="notice" style={{ marginTop: 20, fontSize: 14 }}>
          {t('entrar.sesionRota')}{' '}
          <button onClick={async () => { await supabaseBrowser().auth.signOut(); location.href = '/'; }}
            style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            {t('entrar.limpiar')}
          </button>
        </div>
      )}

      {inviteCoachName && (
        <div className="notice" style={{ marginTop: 20, fontSize: 15 }}>
          {/* El nombre va en negrita, y la frase cambia de orden según el
              idioma: se parte por una marca en vez de pegar trozos a mano. */}
          {(() => {
            const [antes, despues] = t('entrar.invita', { nombre: '\u0000' }).split('\u0000');
            return <>{antes}<b>{inviteCoachName}</b>{despues}</>;
          })()}
        </div>
      )}

      <div className="card" style={{ marginTop: inviteCoachName ? 12 : 28 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 999, padding: 4, marginBottom: 16 }}>
          {tab('signin', t('entrar.entrar'))}{tab('signup', t('entrar.crear'))}{tab('magic', t('entrar.sinClave'))}
        </div>

        {mode === 'signup' && (
          <>
            <div className="field"><label>{t('entrar.nombre')}</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('entrar.nombrePista')} /></div>
            {!inviteCoachId && (
              <div className="field"><label>{t('entrar.codigo')}</label>
                <input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder={t('entrar.codigoPista')} /></div>
            )}
          </>
        )}

        <div className="field"><label>{t('entrar.correo')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" /></div>

        {mode !== 'magic' && mode !== 'olvide' && (
          <div className="field"><label>{t('entrar.clave')}</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder={t('entrar.clavePista')} /></div>
        )}

        {err && <p className="notice mal">{err}</p>}
        {msg && <p className="muted" style={{ fontSize: 14 }}>{msg}</p>}

        <button className="btn flare block" onClick={submit}
          disabled={busy || !email || (mode !== 'magic' && mode !== 'olvide' && pass.length < 6)}>
          {busy ? t('entrar.espera')
            : mode === 'signin' ? t('entrar.entrar')
            : mode === 'signup' ? t('entrar.crear')
            : mode === 'olvide' ? t('entrar.mandarCorreo')
            : t('entrar.enviarEnlace')}
        </button>

        {mode === 'signin' && (
          <button onClick={() => { setMode('olvide'); setErr(''); setMsg(''); }}
            style={{ background: 'none', border: 'none', width: '100%', marginTop: 12, padding: 0,
              color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
            {t('entrar.olvide')}
          </button>
        )}
        {mode === 'olvide' && (
          <>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
              {t('entrar.pocosCorreos')}
            </p>
            <button onClick={() => { setMode('signin'); setErr(''); setMsg(''); }}
              style={{ background: 'none', border: 'none', width: '100%', marginTop: 6, padding: 0,
                color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
              {t('entrar.volverClave')}
            </button>
          </>
        )}

      </div>

      {/* Dentro del APK la app ya está instalada: el consejo sobraba. */}
      {!enLaApp() && <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>{t('entrar.instalar')}</p>}
      <Footer />
    </main>
  );
}
