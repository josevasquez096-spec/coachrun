import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/supabase-server';
import { perfilDe } from '@/lib/guard';

export const dynamic = 'force-dynamic';

/**
 * Quién soy y cuál es mi perfil, en JSON.
 *
 * Es el equivalente de `requireUser()` para los clientes que no se dibujan en
 * el servidor: la app de Android y, tras la mudanza, la propia web. Se queda
 * aquí y no en el navegador porque crear el perfil y aplicar el código de
 * entrenador necesitan permisos de administrador.
 */
export async function GET() {
  const user = await usuarioActual();
  if (!user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  const profile = await perfilDe(user);
  return NextResponse.json({ user: { id: user.id, email: user.email }, profile });
}
