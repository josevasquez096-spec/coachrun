import webpush from 'web-push';
import { supabaseAdmin } from './supabase-server';

let ready = false;
function configure() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:coach@coachrun.app', pub, priv);
  ready = true; return true;
}

/** Envía una notificación a todos los dispositivos de un usuario. */
export async function notifyUser(userId: string, title: string, body: string, url = '/athlete') {
  if (!configure()) return { sent: 0, reason: 'sin llaves VAPID' };
  const db = supabaseAdmin();
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', userId);
  if (!subs?.length) return { sent: 0, reason: 'sin dispositivos' };

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e: any) {
      // 404/410 = el navegador ya no acepta esa suscripción: la limpiamos
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }));
  return { sent };
}
