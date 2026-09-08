'use client';
import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushToggle() {
  const [state, setState] = useState<'cargando' | 'no-soportado' | 'off' | 'on' | 'bloqueado'>('cargando');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setState('no-soportado');
      if (Notification.permission === 'denied') return setState('bloqueado');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    })().catch(() => setState('no-soportado'));
  }, []);

  async function enable() {
    setMsg('');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return setState(perm === 'denied' ? 'bloqueado' : 'off');
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return setMsg('Falta configurar la llave de notificaciones en el servidor.');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    const r = await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (r.ok) { setState('on'); setMsg('Listo. Te avisaremos cuando tu entrenador cambie algo.'); }
    else setMsg('No se pudo guardar la suscripción.');
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState('off'); setMsg('');
  }

  if (state === 'cargando') return null;
  return (
    <>
      <h2>Notificaciones</h2>
      {state === 'no-soportado' && <p className="muted" style={{ fontSize: 14 }}>Este navegador no admite notificaciones. En iPhone, primero añade CoachRun a la pantalla de inicio y ábrela desde ahí.</p>}
      {state === 'bloqueado' && <p className="muted" style={{ fontSize: 14 }}>Las bloqueaste en este navegador. Actívalas desde los ajustes del sitio y vuelve aquí.</p>}
      {state === 'off' && <><p className="muted" style={{ fontSize: 14, marginTop: 0 }}>Recibe un aviso cuando tu entrenador te asigne o cambie un entrenamiento.</p><button className="btn block" onClick={enable}>Activar notificaciones</button></>}
      {state === 'on' && <><p className="muted" style={{ fontSize: 14, marginTop: 0 }}>Activas en este dispositivo.</p><button className="btn ghost block" onClick={disable}>Desactivar</button></>}
      {msg && <p className="muted" style={{ fontSize: 13 }}>{msg}</p>}
    </>
  );
}
