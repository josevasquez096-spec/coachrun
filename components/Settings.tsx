'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import PushToggle from './PushToggle';
import AvatarUpload from './AvatarUpload';
import { zonas } from '@/lib/zones';
import { pedir } from '@/lib/api';
import { refrescar } from '@/lib/pantalla';
import { IDIOMAS, nombreZona, useIdioma } from '@/lib/idioma';

export default function Settings({ me, email }: { me: { id: string; full_name: string | null; role: string; strava_athlete_id: number | null; coach_id: string | null; avatar_url?: string | null; max_hr?: number | null; resting_hr?: number | null }; email?: string }) {
  const r = useRouter();
  const { idioma, t, ponerIdioma } = useIdioma();
  const [name, setName] = useState(me.full_name ?? ''); const [code, setCode] = useState(me.coach_id ?? '');
  const [pass, setPass] = useState(''); const [msg, setMsg] = useState(''); const [pmsg, setPmsg] = useState('');
  const [smsg, setSmsg] = useState('');
  const [maxHr, setMaxHr] = useState(me.max_hr ? String(me.max_hr) : '');
  const [restHr, setRestHr] = useState(me.resting_hr ? String(me.resting_hr) : '');
  const [zmsg, setZmsg] = useState('');
  const zs = zonas(Number(maxHr) || null, Number(restHr) || null);

  async function guardarZonas() {
    setZmsg(t('cuenta.guardando'));
    const { error } = await supabaseBrowser().from('profiles')
      .update({ max_hr: Number(maxHr) || null, resting_hr: Number(restHr) || null }).eq('id', me.id);
    setZmsg(error ? error.message : t('cuenta.zonasGuardadas'));
    refrescar();
  }

  async function save() {
    setMsg(t('cuenta.guardando'));
    const res = await pedir('/api/coach/link', { method: 'POST', body: JSON.stringify({ full_name: name, coach_code: code.trim() }) });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? t('cuenta.guardado') : (j.error ?? t('cuenta.noGuardado')));
    refrescar();
  }
  async function setPassword() {
    const { error } = await supabaseBrowser().auth.updateUser({ password: pass });
    setPmsg(error ? error.message : t('cuenta.claveGuardada')); setPass('');
  }
  async function disconnectStrava() {
    if (!confirm(t('cuenta.desconectarPregunta'))) return;
    setSmsg(t('cuenta.desconectando'));
    const res = await pedir('/api/strava/disconnect', { method: 'POST' });
    setSmsg(res.ok ? t('cuenta.stravaFuera') : t('cuenta.noDesconectado')); refrescar();
  }
  async function out() { await supabaseBrowser().auth.signOut(); location.href = '/'; }

  return (
    <div className="card">
      <AvatarUpload userId={me.id} url={me.avatar_url} name={me.full_name} />
      {email && <p className="muted" style={{ marginTop: 0 }}>{email}</p>}
      <div className="field"><label>{t('cuenta.nombre')}</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>{t('cuenta.codigo')}</label><input value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder={t('cuenta.codigoPista')} /></div>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn block" onClick={save}>{t('com.guardar')}</button>

      <h2>{t('cuenta.idioma')}</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{t('cuenta.idiomaDesc')}</p>
      {/* Cada idioma se guarda en el teléfono, no en el perfil: así la app
          arranca ya en su idioma sin esperar a la respuesta del servidor. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        {IDIOMAS.map((i) => (
          <button key={i.id} type="button" className={`chip ${i.id === idioma ? 'on' : ''}`}
            aria-pressed={i.id === idioma} onClick={() => ponerIdioma(i.id)}>{i.nombre}</button>
        ))}
      </div>

      <h2>{t('cuenta.clave')}</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{t('cuenta.claveDesc')}</p>
      <div className="field"><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t('cuenta.clavePista')} autoComplete="new-password" /></div>
      {pmsg && <p className="muted">{pmsg}</p>}
      <button className="btn block" onClick={setPassword} disabled={pass.length < 6}>{t('cuenta.guardarClave')}</button>

      <h2>{t('cuenta.zonas')}</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{t('cuenta.zonasDesc')}</p>
      <div className="row">
        <div className="field"><label>{t('cuenta.pulsoMax')}</label>
          <input inputMode="numeric" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} placeholder="190" /></div>
        <div className="field"><label>{t('cuenta.pulsoReposo')}</label>
          <input inputMode="numeric" value={restHr} onChange={(e) => setRestHr(e.target.value)} placeholder="55" /></div>
      </div>
      {zs && (
        <div style={{ marginBottom: 10 }}>
          {zs.map((z) => (
            <div key={z.n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 0' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: z.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Z{z.n} · {nombreZona(z.n)}</span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{z.min}–{z.max} ppm</span>
            </div>
          ))}
        </div>
      )}
      {zmsg && <p className="muted">{zmsg}</p>}
      <button className="btn block" onClick={guardarZonas}>{t('cuenta.guardarZonas')}</button>

      <PushToggle />

      <h2>{t('cuenta.strava')}</h2>
      {me.strava_athlete_id ? (
        <>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{t('cuenta.stravaOk', { id: me.strava_athlete_id })}</p>
          {smsg && <p className="muted">{smsg}</p>}
          <button className="btn ghost block" onClick={disconnectStrava}>{t('cuenta.desconectarStrava')}</button>
        </>
      ) : (
        <>
          {smsg && <p className="muted">{smsg}</p>}
          <a className="btn block" style={{ background: '#FC4C02', borderColor: '#FC4C02' }} href="/api/strava/connect">{t('cuenta.conectarStrava')}</a>
        </>
      )}

      <h2>{t('cuenta.sesion')}</h2>
      <button className="btn ghost block" onClick={out}>{t('cuenta.salir')}</button>
    </div>
  );
}
