/**
 * Dos compilaciones del mismo código:
 *  - La de siempre, para Vercel: pantallas + rutas de servidor.
 *  - La del APK (`APP_MOVIL=1`): solo las pantallas, como archivos sueltos que
 *    viajan dentro del teléfono. Las rutas de servidor se quedan en Vercel y la
 *    app las llama por internet (ver `lib/api.ts`).
 */
const movil = process.env.APP_MOVIL === '1';

/**
 * Permiso para que la app del teléfono pueda llamar a las rutas de `/api`.
 *
 * Dentro del APK las pantallas se sirven desde `https://localhost`, así que
 * cada llamada a Vercel es "de otra casa". Antes de dejarla salir, el navegador
 * pregunta al servidor si acepta llamadas desde ahí; si el servidor no
 * contesta que sí, **descarta la respuesta sin avisar**. Eso dejaba la app
 * muda: entrabas con tu contraseña y no pasaba nada.
 *
 * El `*` aquí no abre nada: la sesión de la app viaja en la cabecera
 * `Authorization`, no en cookies, y **a propósito no se pone**
 * `Access-Control-Allow-Credentials`. Sin esa línea el navegador se niega a
 * mandar cookies a otra casa, así que ninguna web ajena puede aprovechar la
 * sesión de quien tenga la web abierta. Para entrar hay que traer el token, y
 * quien lo tiene ya está dentro.
 *
 * El `*` vale además para el día que haya app de iPhone, que usa otra
 * dirección (`capacitor://localhost`).
 */
const permisoApp = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, PUT, DELETE, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'authorization, content-type' },
  // Un día de validez: sin esto el teléfono pregunta antes de CADA llamada,
  // y con datos móviles eso se nota.
  { key: 'Access-Control-Max-Age', value: '86400' },
];

/** @type {import('next').NextConfig} */
module.exports = movil
  ? {
      output: 'export',
      trailingSlash: true,          // para que /athlete/ encuentre su archivo
      images: { unoptimized: true },
    }
  : {
      async headers() {
        return [
          { source: '/sw.js', headers: [{ key: 'Service-Worker-Allowed', value: '/' }, { key: 'Cache-Control', value: 'no-cache' }] },
          { source: '/api/:ruta*', headers: permisoApp },
        ];
      },
    };
