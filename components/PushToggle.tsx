'use client';
import { useEffect, useState } from 'react';
import { pedir } from '@/lib/api';
import { useIdioma } from '@/lib/idioma';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushToggle() {
  const { t } = useIdioma();
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
    if (!key) return setMsg(t('push.faltaLlave'));
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    const r = await pedir('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (r.ok) { setState('on'); setMsg(t('push.listo')); }
    else setMsg(t('push.noGuardado'));
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await pedir('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState('off'); setMsg('');
  }

  if (state === 'cargando') return null;
  return (
    <>
      <h2>{t('push.titulo')}</h2>
      {state === 'no-soportado' && <p className="muted" style={{ fontSize: 14 }}>{t('push.noSoportado')}</p>}
      {state === 'bloqueado' && <p className="muted" style={{ fontSize: 14 }}>{t('push.bloqueado')}</p>}
      {state === 'off' && <><p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{t('push.off')}</p><button className="btn block" onClick={enable}>{t('push.activar')}</button></>}
      {state === 'on' && <><p className="muted" style={{ fontSize: 14, marginTop: 0 }}>{t('push.on')}</p><button className="btn ghost block" onClick={disable}>{t('push.desactivar')}</button></>}
      {msg && <p className="muted" style={{ fontSize: 13 }}>{msg}</p>}
    </>
  );
}
