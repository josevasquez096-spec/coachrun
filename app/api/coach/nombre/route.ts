import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * El nombre de un entrenador a partir de su código, para la pantalla de entrar.
 *
 * Va por el servidor porque quien abre un enlace de invitación todavía no tiene
 * sesión, y las reglas de la base de datos no le dejan leer ningún perfil.
 * Solo devuelve el nombre, y solo si ese código es de un entrenador de verdad.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ nombre: null });
  const { data } = await supabaseAdmin().from('profiles')
    .select('full_name').eq('id', id).eq('role', 'coach').maybeSingle();
  return NextResponse.json({ nombre: data?.full_name ?? null });
}
