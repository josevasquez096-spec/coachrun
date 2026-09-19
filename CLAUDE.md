# MyCoachRuns — contexto del proyecto

Antes se llamaba CoachRun; el nombre cambió en la v4 (el repo y el dominio de
Vercel siguen diciendo `coachrun`, eso no se toca).

App de entrenamiento para un entrenador de running y su grupo. El coach asigna
sesiones estructuradas, los atletas las ven en el teléfono, graban con GPS o con
reloj, y todo se sincroniza con Strava.

- Producción: https://coachrun-delta.vercel.app
- Repo: github.com/josevasquez096-spec/coachrun (rama `main`, deploy automático en Vercel)
- Autoría: JVasquez · Instagram jvasquez324 · Strava athlete 145304552

## Colores (v4)
Del logo: blanco, negro y lima. Definidos en `app/globals.css`.

- `--lima: #94F420` es **el** verde del logo. Es tan brillante que sobre blanco
  **no se lee como letra** (contraste 1,4:1). Solo vale de relleno, y siempre con
  el texto negro encima, nunca blanco. Botones, barra de progreso, RPE elegido,
  trazo del mapa.
- `--verde-txt: #3D680D` es para letra verde sobre fondo claro: la "Runs" de la
  marca, la pestaña activa, "En ritmo". Es el mismo tono, oscurecido.
- `--verde-suave: #EDFBD9` para fondos con tinte, siempre con texto oscuro.
- Los bordes de énfasis (el entreno de hoy, la fase en curso) van en **negro**,
  no en lima: un borde lima sobre blanco queda lavado.
- `--alerta` (naranja) y `--rojo` **no son de la marca**, son señales: naranja
  para "te saliste del objetivo" y para Terminar, rojo solo para los mensajes sin
  leer. Si el verde fuese también la alerta, "Continuar" y "Terminar" se verían
  iguales, y están uno al lado del otro cuando el atleta para a mitad de serie.

Se descartó el fondo oscuro (que sería lo más fiel al logo) porque la app se usa
corriendo al sol, y ahí una pantalla clara se lee mucho mejor.

Todas las combinaciones de texto llegan a 4,5:1. Si se cambia algún color, hay
que volver a comprobarlo antes de subirlo.

Leaflet (`RunMap`) y el canvas (`ActivityOverlay`) no entienden las variables de
CSS: allí el lima está repetido como constante. El trazo del mapa lleva además
un contorno negro por debajo, porque el lima solo se pierde sobre el mapa claro.

Los iconos (`public/icons/`) salen del símbolo del logo (la M con el corredor)
sobre negro, sin el nombre: en 192 px el texto no se leería.

## Cómo hablar conmigo
El dueño del proyecto no es programador. Explica los pasos en español, en
lenguaje llano, y evita jerga sin traducir. Cuando algo falle, di qué mirar y
dónde, no solo el nombre del error.

## Pila
- Next.js 14 (App Router, TypeScript) desplegado en Vercel. Desde la v5 las
  pantallas son **de cliente**, para que el mismo código sirva también dentro
  del APK de Android (`output: 'export'`); ver la sección Android.
- Supabase: Postgres + Auth (correo/contraseña y enlace mágico) + Storage (`avatars`)
- Leaflet + OpenStreetMap para el mapa
- `web-push` para notificaciones
- PWA: `public/manifest.json` + `public/sw.js` (caché, push, click en notificación)
- **No hay middleware.** Se quitó a propósito: `@supabase/ssr` fallaba al cargarse
  en el runtime Edge y tumbaba la app con MIDDLEWARE_INVOCATION_FAILED. La sesión
  la comprueba cada pantalla con `usePantalla()` (que llama a `/api/perfil`), y
  cada ruta de API con `usuarioActual()`. `requireUser()` de `lib/guard.ts` sigue
  existiendo para el lado servidor; `perfilDe()` es la parte reutilizable.

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
- **Aprobada por Strava (sept. 2026).** Capacidad: **999 atletas**. Límites:
  600 peticiones cada 15 min y 6.000 al día en total; de ellas 300 cada 15 min
  y 3.000 al día de lectura. Importar una carrera cuesta ~2 peticiones (leer la
  actividad, y renovar el permiso si toca), así que con una decena de atletas se
  gastan unas decenas al día: hay sitio de sobra. El techo se acercaría por
  encima del centenar de atletas activos a diario.
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

## Grabación de la carrera
`lib/session.ts` es el motor y vive **fuera de React**, en el módulo. Así la
carrera sigue viva al cambiar de pestaña: antes el cronómetro y el GPS colgaban
del componente `Recorder` y se destruían al salir de "Grabar". La pantalla solo
mira, con `useSyncExternalStore`. Regla: nada de estado de grabación dentro de
componentes.

- El tiempo se calcula con el reloj del sistema (`acumuladoMs` + `arranque`), no
  contando interrupciones, porque el navegador ralentiza los temporizadores en
  segundo plano.
- Cada pocos segundos se guarda una copia en `localStorage` (`coachrun.sesion`).
  Si la app se cierra, al volver la carrera aparece **en pausa**: el GPS estuvo
  parado y no sabemos por dónde fue mientras tanto.
- La barra de pestañas enseña un punto verde en "Iniciar" mientras hay carrera.
- **Las fases se reparten con un "bote"**, en `lib/reparto.ts` (función pura,
  probada con `node scripts/probar-reparto.mjs`). Al bloquear la pantalla el
  navegador congela la app, y al volver llegan de golpe varios minutos y varios
  cientos de metros. Sumarlos a la fase actual y adelantar UNA fase tiraba el
  resto: el atleta hacía cinco series y la app seguía en la primera. El bote se
  va gastando fase por fase, y cada fase se cobra en metros **y** en segundos
  usando su propio ritmo previsto. Repartir en proporción al total se pasaba de
  largo (daba a las recuperaciones el ritmo medio de las series). Queda
  ligeramente corto antes que largo: mejor saltar una fase a mano que
  encontrarse el entrenamiento dado por terminado.
- Tras un salto de varias fases se avisa **una sola vez**, no una por fase.
- La pantalla enseña el entrenamiento **resumido**, una línea por fase del coach
  (`describe()`), y se despliega al tocarlo. Por eso cada `Step` lleva `fase`,
  la posición de la fase de la que salió.

## Copiar y pegar entrenamientos
El coach copia un entrenamiento desde la ficha de un alumno ("Copiar" en el
propio entrenamiento) y le aparece un aviso para pegarlo en la ficha de otro,
eligiendo la fecha. El portapapeles es `lib/portapapeles.ts`: vive en el módulo
y con copia en `localStorage`, porque copiar y pegar pasan en pantallas
distintas y si colgara de un componente se perdería al cambiar de alumno.

Se pega por `POST /api/workouts/copiar`, **no** desde el navegador, porque hay
que comprobar que el alumno de destino sea de este coach: la regla RLS de
`workouts` solo mira que el entrenamiento lleve tu `coach_id`, no a quién se lo
asignas. `WorkoutForm` sí inserta desde el cliente (viene de antes) y por eso
tiene ese mismo agujero: si se toca, conviene pasarlo por la ruta también.

## Dominio propio: mycoachruns.com (libre para mudarse)
Comprado `mycoachruns.com`. Estuvo en espera mientras Strava revisaba la
ampliación de atletas; **ya está aprobada, así que el freno desapareció**. El
proyecto sigue en `coachrun-delta.vercel.app` hasta que se haga la mudanza.

Orden de la mudanza, y qué afecta cada pieza:

1. Vercel → Settings → Domains → añadir el dominio, poner los DNS que indique
   Vercel, esperar el verde y marcarlo como principal.
2. `NEXT_PUBLIC_APP_URL` a `https://mycoachruns.com` y volver a desplegar. Solo
   se usa para el `redirect_uri` de una conexión **nueva** de Strava
   (`lib/strava.ts`): no toca los permisos ya concedidos.
3. Supabase → Authentication → URL Configuration: añadir
   `https://mycoachruns.com/auth/callback`, **dejando también la vieja** durante
   la transición.
4. **Lo último:** Strava → strava.com/settings/api → *Authorization Callback
   Domain*. Es un solo valor: al cambiarlo, conectar Strava deja de funcionar
   desde el dominio viejo.

Lo que **no** se rompe: los permisos de Strava viven en `profiles`
(`strava_refresh_token` y compañía) en Supabase, y ningún paso de arriba los
toca. El webhook (suscripción 371658) tiene su propia `callback_url` guardada en
Strava, independiente del callback domain, así que sigue importando carreras
mientras el dominio de Vercel siga vivo. Moverlo es borrar y recrear la
suscripción, y no corre prisa.

Lo que sí molesta: la sesión se guarda por dominio, así que **todos tendrán que
volver a entrar** y reinstalar la app de la pantalla de inicio. Conviene avisar
al grupo con un solo mensaje cuando el dominio ya esté en verde.

`mycoachruns.com` ya está en `allowNavigation` de la cáscara de Android.

## Android (v5)
La cáscara de Android está en `movil/` (Capacitor), aparte para que Vercel no
arrastre sus dependencias. **Lleva la app entera dentro**: las 8 pantallas
viajan en el APK y la grabación usa el GPS nativo, que sigue midiendo con la
pantalla apagada. Todo el detalle, los porqués y las trampas en `movil/LEEME.md`.
El APK lo compila GitHub Actions y queda en Releases (entrega `apk-prueba`).

**Un solo código, dos compilaciones** (`next.config.js` mira `APP_MOVIL`):

- Sin la variable: la web de siempre para Vercel, pantallas + rutas de API.
- `APP_MOVIL=1`: `output: 'export'`, solo pantallas, archivos sueltos para el APK.

Se compila con `./scripts/compilar-movil.sh [dirección]`, que aparta `app/api` y
`app/auth/callback` (son de servidor y no se exportan), compila, las devuelve, y
deja el resultado en `movil/www` (generado, no se guarda en el repo).

Las piezas que sostienen esto, y que **no hay que romper**:

- **Todas las pantallas son de cliente**, con `usePantalla()` de `lib/pantalla.ts`:
  pide sesión y perfil a `/api/perfil` (el equivalente en JSON de `requireUser()`)
  y hace sus consultas desde el navegador; RLS ya las permite. Efecto secundario
  bueno: cambiar de pestaña es instantáneo, ya no hay ida y vuelta al servidor.
- **Nunca `fetch('/api/...')` a pelo**: siempre `pedir()` de `lib/api.ts`, que le
  pone delante la dirección de Vercel (`NEXT_PUBLIC_API_URL`) y adjunta la sesión
  en `Authorization: Bearer`. Dentro del APK no hay cookies de ese dominio ni
  existe esa ruta relativa.
- **El servidor acepta cookie o cabecera**: `usuarioActual()` de
  `lib/supabase-server.ts`, en las 12 rutas de API.
- **`lib/gps.ts` es el único sitio que decide** GPS nativo o del navegador.
  `lib/session.ts` no sabe cuál le habla: recibe posiciones y ya.
- La compilación del APK necesita `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` guardadas en los secretos del repositorio en
  GitHub (los mismos valores de Vercel): quedan grabadas dentro del APK.

Medido en un Samsung real (no simulado), con la app en primer plano:

- El GPS nativo llega a la app: ~1 punto por segundo, precisión de ±2 a ±4 m.
- **Quieto 3 min:** lectura cruda 134 m, filtrada **0 m**. El filtro de
  `lib/geo.ts` se come el temblor entero. Esta es la confirmación en hardware
  real del fallo de "marcar de más".
- **Caminando 2,5 min:** cruda 201 m, filtrada **156 m** (22 % de ruido
  descartado), subiendo a un ritmo constante de ~1,05 m/s, que es el paso real.
  De 137 puntos descartó 2 por malos.

- **Contra el Garmin, 10 min caminando:** reloj 0,86 km, app **0,82 km**. Un
  4,7 % por debajo. Por debajo, que es el lado bueno. Caminando es el peor caso
  del filtro: a poca velocidad el umbral pesa más, y las esquinas de un paseo
  por el barrio se recortan. En carrera, más rápido y más recto, debería
  acercarse. **Falta el mismo contraste corriendo**, que es el uso real, antes
  de plantearse recalibrar nada.

- **Con la app de verdad (no la de prueba), 25 min caminando un recorrido con
  muchas paradas:** Garmin 500 m, app **490 m**. Un 2 % por debajo, la mitad de
  desvío que en la prueba anterior. Lo valioso no es el 2 % (a 500 m cualquier
  diferencia pesa mucho en porcentaje), sino **que las paradas no inflaron
  nada**: estar parado es justo el caso que antes hacía marcar de más, y el
  filtro lo aguantó en la calle, no solo en la simulación.
  En esa misma prueba el teléfono estuvo **bloqueado casi todo el rato y
  usando otras apps por encima**, y siguió midiendo: es una prueba más dura que
  la de solo apagar la pantalla. La actividad terminada apareció luego sin
  problema en la web. **Falta todavía el contraste corriendo**, y probar la voz.

- **Con la pantalla bloqueada todo el rato: siguió midiendo.** Esta era la
  prueba que decidía si la app nativa merecía la pena, y la respuesta es sí.
  Es justo lo que el navegador NO puede hacer, y el único motivo de peso para
  empaquetar la app. El servicio en primer plano de Android aguanta.

**El puente nativo NO llega a la web remota**, y por eso hubo que meter la web
dentro. Probado: al abrir `coachrun-delta.vercel.app` desde dentro de la
cáscara, el distintivo sale naranja ("SIN puente nativo"): `window.Capacitor` no
existe en esa página. Android solo inyecta el puente en los archivos que viajan
dentro del APK. No hay atajo.

La pantalla de diagnóstico del GPS se conserva en `movil/prueba/` y se publica
en `/prueba/` dentro de la app: costó cinco salidas a la calle averiguar lo que
mide. Ojo, lleva **una copia a mano del filtro de `lib/geo.ts`** (no pasa por el
compilador del proyecto): si se tocan el peso o el umbral, hay que cambiarlos
allí también.

## Chat (v3)
`/chat` + `app/api/messages/route.ts`. El atleta habla siempre con su coach; el
coach elige alumno con `?atleta=<id>`. La ruta comprueba que el atleta sea
realmente del coach antes de leer o escribir. Al enviar, se manda un push al
otro con URL `/chat`. El cliente refresca cada 12 s (no hay realtime).

Los mensajes sin leer se cuentan en `/api/messages/unread` y se comparten con
`lib/avisos.ts`, otro almacén de módulo: la barra se vuelve a montar en cada
pantalla y así el número no parpadea. Se refresca cada 30 s y al volver a la app.

## Cosas que ya se rompieron (no repetir)
- Fechas en UTC: usar `todayLocal()` de `lib/format.ts`. Con `toISOString()` el
  entrenamiento "de hoy" desaparecía a partir de las 20:00 en República Dominicana.
- Borrar entrenamientos fallaba por la clave foránea de `activities`. Resuelto con
  `on delete set null` y anulando `workout_id` antes de borrar.
- Errores silenciosos: toda operación de escritura debe mostrar el motivo real al
  usuario, no fallar sin decir nada.
- GPS, marcar de menos: descartar avances menores de 3 m perdía cientos de metros
  por kilómetro.
- GPS, marcar de más: la solución anterior sumaba la distancia entre cada par de
  puntos seguidos, así que el temblor del GPS se sumaba en vez de cancelarse.
  Caminando 150 m reales marcaba 210. Ahora `medir()` de `lib/geo.ts` suaviza cada
  punto y solo suma metros cuando te alejas de un **ancla** más que el ruido; el
  ancla se mueve entonces al punto nuevo. Los temblores en el sitio no suman.
  El peso del suavizado y el umbral están calibrados con `scripts/simular-gps.mjs`
  (`node scripts/simular-gps.mjs`): **si se tocan, hay que volver a pasar esa
  tabla**. Bajar el umbral devuelve el problema de marcar de más; subirlo empieza
  a cortar las curvas cerradas.
- La distancia guardada es la que midió el filtro durante la carrera, no una suma
  de la traza hecha en el servidor: recalcularla allí volvía a inflarla.
- Descargas de imágenes en iPhone: `<a download>` con blob no funciona; usar
  `navigator.share` con el fichero.
- Dentro de `onPosition` del `Recorder` no se pueden leer estados de React: la
  función se registra una sola vez en `watchPosition` y se queda con los valores
  del arranque. Lo que haga falta ahí va en un `useRef`.
- La app se quedaba **muda a mitad de carrera**. Dos causas, las dos en
  `lib/audio.ts`: el navegador suspende el `AudioContext` al pasar a segundo
  plano y no lo reanuda solo (`despertarAudio()`, al volver a la app y cada 20 s),
  y la voz se queda colgada aceptando frases sin decirlas (se llama a
  `speechSynthesis.cancel()` antes de cada frase). Las frases van en cola: dos
  seguidas se cortaban entre sí.
- **La app del teléfono entraba y se quedaba muda.** Metías la contraseña y no
  pasaba nada: ni error ni pantalla nueva. La contraseña era correcta y la
  sesión se guardaba (eso lo hace Supabase, y funciona); lo que fallaba era la
  llamada siguiente a `/api/perfil`. Dentro del APK las pantallas se sirven
  desde `https://localhost`, así que toda llamada a Vercel es de otro origen y
  el navegador pregunta antes si el servidor la acepta (petición `OPTIONS`).
  Nadie contestaba eso, y el navegador **descarta la respuesta sin avisar**.
  Arreglado con las cabeceras `Access-Control-*` en `next.config.js` para
  `/api/:ruta*`. Si se añade otra ruta de servidor fuera de `/api`, hay que
  acordarse de cubrirla también.
  El `Allow-Origin` va en `*` y **no** se pone `Allow-Credentials`, a propósito:
  la app se identifica con la cabecera `Authorization`, y sin esa línea el
  navegador se niega a mandar cookies a otro origen, así que la sesión por
  cookie de la web queda fuera del alcance de cualquier web ajena.
- Ligado a lo anterior: `app/page.tsx` **se tragaba** el fallo de `/api/perfil`
  y por eso el síntoma fue "no hace nada" en vez de un mensaje. Costó una
  sesión entera de pruebas a ciegas. Los fallos de red se traducen con
  `motivoDeFallo()` de `lib/api.ts`, porque el navegador solo dice
  «Failed to fetch», que no ayuda a nadie.
- La voz leía solo un extremo del ritmo ("a 3:00" en vez de "entre 3 y 3:30") y
  demasiado rápido. Los textos hablados se arman con `dictarCantidad()` y
  `dictarObjetivo()` de `lib/phases.ts`, no a mano: "3:30" hay que dictarlo
  "3 30" y "Serie 2/12" como "Serie 2 de 12", o la voz lo lee como una división.

## Que la app vaya fluida
Hasta la v4 cada página era `force-dynamic` y hacía `requireUser()` en el
servidor antes de su propia consulta: varias idas y vueltas por pestaña. Desde
la v5 **todas las pantallas son de cliente** (`usePantalla()`), así que cambiar
de pestaña no vuelve al servidor: la sesión y el perfil se piden una sola vez a
`/api/perfil` y se guardan en el módulo. Lo demás sigue en pie:

- `app/loading.tsx` enseña un esqueleto en cuanto se toca la pestaña. Sin él el
  teléfono se quedaba con la pantalla anterior y el cambio parecía lento.
- `aligerar()` de `lib/actividad.ts` recorta `activities.raw` antes de mandarlo al
  teléfono. La respuesta entera de Strava son cientos de kilobytes por carrera.
- El perfil trae ya `max_hr`/`resting_hr` desde `usePantalla()`: no repetir esa
  consulta en las pantallas.
- La ficha del alumno pide **solo** la lista de la pestaña que se mira, y en paralelo.
- La fuente va con `next/font` (servida desde el propio dominio). El `<link>` a
  Google Fonts bloqueaba el primer dibujado.

## Límites conocidos
- **En el navegador** el GPS se corta con la pantalla bloqueada (sobre todo
  iOS). Para tiradas largas desde la web, el reloj es la vía fiable. **La app de
  Android ya no tiene este límite**; en iPhone sigue igual porque todavía no hay
  app.
- Notificaciones push en iPhone solo si la app está añadida a la pantalla de inicio.
- Bluetooth (cinturón de pulso) solo en Android con Chrome.
- Supabase con SMTP propio sin configurar: 2 correos por hora. Por eso el acceso
  principal es con contraseña.

## Ideas pendientes
- Asignar un entrenamiento a varios alumnos **de una vez** (hoy se copia y se
  pega alumno por alumno, que ya resuelve el caso pero repitiendo el pegado).
- Comparación automática objetivo vs real con semáforo.
- La barra inferior tiene 6 pestañas para el coach y queda apretada en pantallas
  pequeñas.
- Guardar en el repo las cuatro migraciones que faltan.
