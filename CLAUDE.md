# CoachRun — contexto del proyecto

App de entrenamiento para un entrenador de running y su grupo. El coach asigna
sesiones estructuradas, los atletas las ven en el teléfono, graban con GPS o con
reloj, y todo se sincroniza con Strava.

- Producción: https://coachrun-delta.vercel.app
- Repo: github.com/josevasquez096-spec/coachrun (rama `main`, deploy automático en Vercel)
- Autoría: JVasquez · Instagram jvasquez324 · Strava athlete 145304552

## Cómo hablar conmigo
El dueño del proyecto no es programador. Explica los pasos en español, en
lenguaje llano, y evita jerga sin traducir. Cuando algo falle, di qué mirar y
dónde, no solo el nombre del error.

## Pila
- Next.js 14 (App Router, TypeScript) desplegado en Vercel
- Supabase: Postgres + Auth (correo/contraseña y enlace mágico) + Storage (`avatars`)
- Leaflet + OpenStreetMap para el mapa
- `web-push` para notificaciones
- PWA: `public/manifest.json` + `public/sw.js` (caché, push, click en notificación)
- **No hay middleware.** Se quitó a propósito: `@supabase/ssr` fallaba al cargarse
  en el runtime Edge y tumbaba la app con MIDDLEWARE_INVOCATION_FAILED. La sesión
  se comprueba en cada página con `requireUser()` de `lib/guard.ts`.

## Variables de entorno (Vercel)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
STRAVA_CLIENT_ID (260144), STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN,
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

Las `NEXT_PUBLIC_` deben tener visibilidad **Config** en Vercel, no Secret.

## Base de datos
Los ficheros de `supabase/` son migraciones que se ejecutan a mano en el SQL Editor.
Aplicadas hasta ahora: `schema.sql`, `migration-fases.sql`, `migration-push.sql`,
`migration-borrar.sql`, `migration-fotos.sql`, `migration-v3.sql`.

Ojo: en el repo solo están `schema.sql` y `migration-v3.sql`. Las cuatro de en
medio se ejecutaron en Supabase pero nunca se guardaron aquí, así que la base de
datos **no se puede reconstruir desde cero** solo con este repo.

Tablas: `profiles`, `workouts`, `activities`, `push_subscriptions`, `messages`.

- `profiles`: role ('coach'|'athlete'), coach_id, tokens de Strava, avatar_url,
  max_hr, resting_hr. Un disparador crea el perfil al registrarse.
- `workouts`: entrenamientos asignados. `phases` (jsonb) guarda las fases
  estructuradas; ver `lib/phases.ts`.
- `activities`: carreras hechas, de Strava (webhook) o grabadas en la app.
  `rpe`, `notes`, `avg_hr`, `raw` (respuesta completa de Strava, incluye splits_metric).
- `messages`: hilo de chat entre coach y atleta (`coach_id`, `athlete_id`,
  `sender_id`, `body`, `read_at`).
- RLS activo en todo. Las escrituras delicadas van por rutas API con
  `supabaseAdmin()` y comprobación explícita de propiedad, porque desde el
  cliente RLS las rechazaba en silencio.

## Vinculación coach ↔ atleta
El "código de entrenador" es el UUID del coach. El enlace de invitación es
`/?coach=<uuid>`. El código se guarda en `user_metadata.coach_code` y `requireUser()`
lo aplica al entrar si el perfil aún no tiene coach. Siempre normalizar con
`cleanCode()` (recorta espacios, valida UUID): los espacios al copiar de WhatsApp
causaban "código no encontrado".

## Strava
- OAuth en `app/api/strava/`. El webhook (`/api/strava/webhook`) importa cada
  carrera nueva y la asocia al entrenamiento del mismo día.
- Suscripción del webhook: id 371658.
- La app está en modo desarrollador: **límite de atletas conectados**. Solicitud
  de ampliación pendiente en strava.com/settings/api.
- La app también sube GPX a Strava (`activity:write`). Desde la v3 es **opcional**:
  una casilla al terminar la carrera decide si se sube o se guarda solo aquí.

## Garmin
No hay API para enviar entrenamientos (requiere ser socio aprobado). En su lugar
se genera un archivo `.FIT` de tipo workout con `lib/fit.ts` (codificador propio,
validado con fitparse). El atleta lo copia por USB a `Garmin/NewFiles`. La web de
Garmin Connect **no** sirve: allí solo se importan actividades, y el archivo
aparecería como una ruta.

## Pulso y esfuerzo (v3)
- `lib/zones.ts` calcula las 5 zonas por reserva de frecuencia cardíaca
  (Karvonen). Si no hay pulso en reposo, cae a porcentaje del máximo.
  Devuelve `null` si no hay `max_hr`: siempre comprobarlo antes de pintar.
- El coach puede fijar `hrZone` (1-5) en cada fase, como alternativa al ritmo.
- `lib/ble.ts` lee el cinturón de pulso con el perfil Bluetooth estándar
  (servicio `heart_rate`, 0x180D).
- Al terminar, el atleta marca el esfuerzo percibido (RPE 1-10) y escribe notas.
  Ambos se guardan en `activities` y el coach los ve en la ficha.

## Chat (v3)
`/chat` + `app/api/messages/route.ts`. El atleta habla siempre con su coach; el
coach elige alumno con `?atleta=<id>`. La ruta comprueba que el atleta sea
realmente del coach antes de leer o escribir. Al enviar, se manda un push al
otro con URL `/chat`. El cliente refresca cada 12 s (no hay realtime).

## Cosas que ya se rompieron (no repetir)
- Fechas en UTC: usar `todayLocal()` de `lib/format.ts`. Con `toISOString()` el
  entrenamiento "de hoy" desaparecía a partir de las 20:00 en República Dominicana.
- Borrar entrenamientos fallaba por la clave foránea de `activities`. Resuelto con
  `on delete set null` y anulando `workout_id` antes de borrar.
- Errores silenciosos: toda operación de escritura debe mostrar el motivo real al
  usuario, no fallar sin decir nada.
- GPS: descartar avances menores de 3 m perdía cientos de metros por kilómetro.
  `acumular()` en `lib/geo.ts` los suma en lugar de tirarlos, y descarta los
  saltos imposibles (más de 12 m/s).
- Descargas de imágenes en iPhone: `<a download>` con blob no funciona; usar
  `navigator.share` con el fichero.
- Dentro de `onPosition` del `Recorder` no se pueden leer estados de React: la
  función se registra una sola vez en `watchPosition` y se queda con los valores
  del arranque. Lo que haga falta ahí va en un `useRef`.

## Límites conocidos
- El navegador corta el GPS con la pantalla bloqueada (sobre todo iOS). Para
  tiradas largas, el reloj es la vía fiable.
- Notificaciones push en iPhone solo si la app está añadida a la pantalla de inicio.
- Bluetooth (cinturón de pulso) solo en Android con Chrome.
- Supabase con SMTP propio sin configurar: 2 correos por hora. Por eso el acceso
  principal es con contraseña.

## Ideas pendientes
- Asignar un entrenamiento a varios alumnos a la vez.
- Comparación automática objetivo vs real con semáforo.
- La barra inferior tiene 6 pestañas para el coach y queda apretada en pantallas
  pequeñas.
- El aviso por voz de cada kilómetro debería decir el pulso, pero se queda con el
  valor del arranque (ver la nota del `Recorder` más arriba).
- Guardar en el repo las cuatro migraciones que faltan.
