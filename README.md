# CoachRun

PWA para entrenadores de running: asignas entrenamientos a cada alumno, ellos los ven en su plan, graban con GPS desde la app o con reloj/Strava, y todo se sincroniza.

## Cómo funciona la sincronización
- **Strava → app:** cada alumno conecta su Strava. Strava avisa al webhook cuando sube una actividad (grabada en Strava, o sincronizada desde Garmin/Coros/Apple Watch). La app la importa y la casa con el entrenamiento asignado ese día.
- **App → Strava:** al terminar de grabar, la app genera un GPX y lo sube a Strava con la cuenta del alumno (como hace Garmin Connect).

## Puesta en marcha
1. **Supabase:** crea un proyecto, pega `supabase/schema.sql` en SQL Editor. En Auth → URL Configuration añade `https://TU-APP.vercel.app/auth/callback` a Redirect URLs. Conviértete en coach: `update profiles set role='coach' where id='TU-UUID';`
2. **Strava:** en https://www.strava.com/settings/api pon como *Authorization Callback Domain* tu dominio de Vercel (sin https).
3. **Vercel:** importa el repo, copia `.env.example` a las variables de entorno.
4. **Webhook de Strava** (una sola vez, tras desplegar):
   ```
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
     -F callback_url=https://TU-APP.vercel.app/api/strava/webhook \
     -F verify_token=$STRAVA_VERIFY_TOKEN
   ```
5. Instala en el teléfono: Safari/Chrome → Compartir → Añadir a pantalla de inicio.

## Desarrollo local
```
npm install && cp .env.example .env.local && npm run dev
```
(El webhook y el OAuth de Strava necesitan una URL pública; usa `vercel dev` o un túnel.)

## Límites a tener en cuenta
- Una PWA no graba GPS con la pantalla bloqueada (iPhone lo corta; Android lo mantiene con wake lock si la pantalla sigue encendida). Para carreras largas, la vía fiable es grabar con reloj/Strava y dejar que el webhook la traiga.
- La API de Strava tiene límite de 200 peticiones/15 min y 2.000/día por app; sobra para un grupo de entreno.
- Los alumnos se vinculan con tu *código de entrenador* (tu UUID, visible en el panel).
