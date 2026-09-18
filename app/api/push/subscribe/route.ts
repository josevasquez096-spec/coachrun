import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin, usuarioActual } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const user = await usuarioActual();
  if (!user) return NextResponse.json({}, { status: 401 });
  const { subscription } = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: 'sin suscripción' }, { status: 400 });
  await supabaseAdmin().from('push_subscriptions').upsert({
    user_id: user.id, endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await usuarioActual();
  if (!user) return NextResponse.json({}, { status: 401 });
  const { endpoint } = await req.json();
  await supabaseAdmin().from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
