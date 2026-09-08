import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/** Devuelve solo el nombre del coach, para mostrarlo en el enlace de invitación. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'falta id' }, { status: 400 });
  const { data } = await supabaseAdmin().from('profiles').select('full_name').eq('id', id).eq('role', 'coach').maybeSingle();
  if (!data) return NextResponse.json({ error: 'no encontrado' }, { status: 404 });
  return NextResponse.json({ full_name: data.full_name });
}
