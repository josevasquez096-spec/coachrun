import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

/**
 * Cliente del servidor con la identidad de quien hace la petición.
 *
 * Acepta dos formas de identificarse, porque hay dos clientes distintos:
 *  - **El navegador**, que manda la sesión en cookies (como siempre).
 *  - **La app de Android**, que no puede mandar cookies de otro dominio y manda
 *    la identificación en la cabecera `Authorization: Bearer …`.
 *
 * Cuando llega la cabecera se pasa también a las consultas, para que las reglas
 * de la base de datos vean al usuario correcto y no a un anónimo.
 */
function tokenDeLaPeticion() {
  try {
    const a = headers().get('authorization') ?? '';
    return a.toLowerCase().startsWith('bearer ') ? a.slice(7).trim() : null;
  } catch { return null; }
}

export function supabaseServer() {
  const store = cookies();
  const token = tokenDeLaPeticion();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all: { name: string; value: string; options?: any }[]) => { try { all.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} },
    },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

/**
 * Quién hace la petición, venga del navegador o de la app.
 * Usar SIEMPRE esto en las rutas de API, nunca `auth.getUser()` a secas: sin el
 * token explícito, una petición de la app se leería como anónima.
 */
export async function usuarioActual() {
  const sb = supabaseServer();
  const token = tokenDeLaPeticion();
  const { data } = token ? await sb.auth.getUser(token) : await sb.auth.getUser();
  return data?.user ?? null;
}

/** Solo en rutas API del servidor: salta RLS (webhooks, tokens de Strava). */
export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
