/**
 * Dos compilaciones del mismo código:
 *  - La de siempre, para Vercel: pantallas + rutas de servidor.
 *  - La del APK (`APP_MOVIL=1`): solo las pantallas, como archivos sueltos que
 *    viajan dentro del teléfono. Las rutas de servidor se quedan en Vercel y la
 *    app las llama por internet (ver `lib/api.ts`).
 */
const movil = process.env.APP_MOVIL === '1';

/** @type {import('next').NextConfig} */
module.exports = movil
  ? {
      output: 'export',
      trailingSlash: true,          // para que /athlete/ encuentre su archivo
      images: { unoptimized: true },
    }
  : {
      async headers() {
        return [{ source: '/sw.js', headers: [{ key: 'Service-Worker-Allowed', value: '/' }, { key: 'Cache-Control', value: 'no-cache' }] }];
      },
    };
