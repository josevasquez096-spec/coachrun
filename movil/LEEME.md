# MyCoachRuns en Android

Cáscara de Android hecha con Capacitor. Está **aparte del proyecto web a propósito**:
Vercel compila la raíz del repositorio y no debe arrastrar estas dependencias.

## Qué es esto ahora mismo

La **app entera dentro del teléfono**. Las 8 pantallas de la web viajan dentro
del APK como archivos sueltos, y el motor de grabación usa el GPS nativo de
Android, que **sigue midiendo con la pantalla apagada** (eso es lo que el
navegador no puede hacer, y el único motivo de peso para empaquetar la app).

Cómo se llegó aquí, porque explica por qué está montado así:

1. Primero fue una app de prueba (`movil/prueba/`, que sigue ahí) para medir el
   GPS en segundo plano. Respondió que sí: 10 min caminando dieron 0,82 km
   contra 0,86 km del Garmin, y con la pantalla bloqueada todo el rato siguió
   midiendo.
2. Después se probó el atajo: que la cáscara cargara la web desde internet y le
   prestara el GPS nativo. **No funciona.** Al abrir
   `coachrun-delta.vercel.app` desde dentro de la cáscara, `window.Capacitor`
   no existe (el distintivo de `components/PuenteNativo.tsx` sale naranja).
   Android solo inyecta el puente en los archivos que viajan dentro del APK.
   Es el fallo conocido ionic-team/capacitor#2373.
3. Sin atajo, quedaban dos caminos: convertir la web para que viaje dentro del
   APK (un solo código) o hacer una app nativa aparte (dos códigos que
   mantener). Se eligió el primero.

## Un solo código, dos compilaciones

`next.config.js` mira la variable `APP_MOVIL`:

- **Sin ella** (lo que hace Vercel): la web de siempre, pantallas + rutas de API.
- **`APP_MOVIL=1`**: `output: 'export'`, solo las pantallas, como archivos
  sueltos. Las rutas de API **no se pueden empaquetar** (necesitan un servidor
  que las ejecute), así que se quedan en Vercel y la app las llama por internet.

Eso obligó a tres cosas, que ya están hechas:

- **Las 8 pantallas son de cliente.** Antes cada una hacía `requireUser()` en el
  servidor; ahora usan `usePantalla()` de `lib/pantalla.ts`, que pide la sesión
  y el perfil a `/api/perfil` y hace las consultas desde el navegador (RLS ya
  las permite). Efecto secundario bueno: cambiar de pestaña es instantáneo, ya
  no hay ida y vuelta al servidor.
- **Las llamadas de API pasan todas por `pedir()` de `lib/api.ts`**, que les
  pone delante la dirección de Vercel y adjunta la sesión en la cabecera
  `Authorization: Bearer`. Dentro del APK no hay cookies del dominio de Vercel,
  así que sin eso el servidor no sabría quién llama. **Nunca llamar a
  `fetch('/api/...')` a pelo**: dentro del APK esa dirección no existe.
- **El servidor acepta las dos formas.** `supabaseServer()` y `usuarioActual()`
  de `lib/supabase-server.ts` leen la sesión de la cookie (web) o de la cabecera
  (app). Las 12 rutas de API usan `usuarioActual()`.

Para compilar la parte del móvil, desde la raíz del repositorio:

```
./scripts/compilar-movil.sh                      # apunta a coachrun-delta.vercel.app
./scripts/compilar-movil.sh https://otro.sitio   # o a donde se quiera
```

El guion aparta un momento `app/api` y `app/auth/callback` (son de servidor y
no se pueden exportar), compila, y las devuelve a su sitio pase lo que pase.
Deja el resultado en `movil/www`, que **no se guarda en el repositorio**: se
genera en cada compilación.

## `lib/gps.ts`: el único sitio que decide GPS nativo o del navegador

`enLaApp()` dice si estamos dentro del APK. `seguirPosicion()` arranca el
vigilante nativo (con su servicio en primer plano) o `watchPosition` del
navegador, y devuelve siempre la misma forma de punto. `lib/session.ts` no sabe
cuál de los dos le está hablando: para él son posiciones y ya.

## `registerPlugin` no viene con Android (esto ya nos mordió)

La primera versión llevaba el guion suelto dentro del HTML y la app arrancaba,
pero al tocar Empezar salía:

    window.Capacitor.registerPlugin is not a function

Android inyecta un `window.Capacitor` mínimo (sirve para saber la plataforma),
pero **la función para cargar complementos la trae la librería
`@capacitor/core` y hay que empaquetarla dentro de la página**. Por eso el guion
vive en `src/app.js` y se empaqueta con esbuild (lo hace
`scripts/compilar-movil.sh`) antes de `cap sync`. Si alguna vez se vuelve a
escribir JavaScript suelto en `www/`, el mismo fallo vuelve.

## El complemento de segundo plano se calla si no hay permiso

Segunda cosa que nos mordió: con el permiso de ubicación denegado, `addWatcher`
**resuelve sin error y luego no llama nunca al callback**. Ni un punto, ni un
fallo: la pantalla se queda en ceros y parece que la app no hace nada.

Por eso ahora el permiso se mira con `@capacitor/geolocation` (`checkPermissions`
/ `requestPermissions`) **antes** de arrancar el vigilante, y se enseña el
resultado. Hay además un botón de "Probar un punto ahora" que pide una sola
posición: separa "el GPS del teléfono no va" de "el segundo plano no va", que
son problemas distintos con arreglos distintos. Y un vigilante que avisa si
pasan 30 s sin recibir nada.

## "NOT_AUTHORIZED" significa dos cosas distintas

La que más salidas a la calle costó. El complemento devuelve el mismo código
`NOT_AUTHORIZED` para dos situaciones que no tienen nada que ver:

    if (permiso != GRANTED)            { ...pedirlo... }
    else if (!isLocationEnabled(ctx))  { reject("Location services disabled.", "NOT_AUTHORIZED") }

La segunda rama **solo se alcanza con el permiso ya concedido**: lo que está
apagado es el interruptor general de Ubicación de Android, el que afecta a todas
las apps. La pantalla lo pintaba como "permiso DENEGADO", el usuario iba a los
ajustes de la app, veía el permiso concedido, y vuelta a empezar.

Se distinguen por el texto (`ubicacionApagada()` mira "location services" y
"not enabled"), y el caso del interruptor sale como un aviso grande y naranja
que dice dónde encenderlo. Si algún día se cambia de complemento, esto hay que
volver a mirarlo.

## Nunca bloquear el arranque con una comprobación de permiso

Cuarta cosa que nos mordió, y la más cara: la app comprobaba el permiso de
ubicación con `@capacitor/geolocation` y **se negaba a arrancar** si no salía
`granted`. Con el permiso concedido en los ajustes de Android, la comprobación
seguía devolviendo otra cosa (pasa, entre otros casos, si lo concedido es la
ubicación *aproximada*: el permiso fino figura denegado). Resultado: la app no
medía nunca y decía "sin permiso de ubicación" con el permiso puesto.

Regla: **quien pide el permiso es quien lo necesita**. El complemento de segundo
plano ya lo pide solo (`requestPermissions: true`) y avisa por su callback con
`NOT_AUTHORIZED` si de verdad falta. `mirarPermiso()` es solo informativa y no
decide nada; enseña por separado la precisa y la aproximada, porque tener solo
la aproximada mide fatal y conviene verlo.

## Las distancias cortas marcan cero, y está bien

Tercera confusión: caminar 10 m por el patio marca 0,00 km. No es un fallo. El
filtro no suma nada hasta que el recorrido se aleja del ancla más que el ruido
del GPS (entre 8 y 15 m según la precisión). Es justo lo que impide que estar
parado sume kilómetros.

Por eso la pantalla enseña ahora **«Avance sin confirmar» (x / umbral)** y
**«En línea recta desde el inicio»**. Esta segunda no pasa por el filtro: si
caminas 100 m derecho, tiene que marcar ~100 m. Es la vara de medir contra la
que comparar los km filtrados.

Una prueba en un patio no vale. Hacen falta **100 m o más en línea recta**.

## El filtro de distancia está duplicado

`movil/prueba/index.html` lleva una copia en JavaScript de `medir()` de
`lib/geo.ts`, porque esa página de diagnóstico no pasa por el compilador del
proyecto web (la app de verdad sí usa `lib/geo.ts`, así que esto solo afecta a
la pantalla de pruebas). **Si allí se cambian el peso
o el umbral, hay que cambiarlos aquí también**, o la prueba deja de medir lo mismo
que la app.

## Cómo se compila

No hace falta ningún computador con Android Studio. Lo hace GitHub en la nube:
`.github/workflows/apk.yml`. Se lanza solo al tocar `movil/`, `app/`,
`components/` o `lib/`, o a mano desde la pestaña **Actions** del repositorio.
El APK queda en **Releases**, con enlace público, siempre en la misma entrega
(`apk-prueba`) para que el enlace no cambie.

**Hacen falta dos claves guardadas en el repositorio** (GitHub → Settings →
Secrets and variables → Actions): `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, con los mismos valores que ya están en Vercel.
Quedan grabadas dentro del APK al compilar; no son secretas (ya viajan a
cualquier navegador que abra la web), pero sin ellas la app se instala y no
puede entrar. La compilación para y lo dice si faltan.

Va firmado con la clave de pruebas de Android, así que **para instalar una versión
nueva hay que desinstalar la anterior**. Cuando pasemos a la app de verdad habrá
que crear una clave propia, guardarla en los secretos del repositorio y no
perderla nunca: si se pierde, las actualizaciones dejan de instalarse encima.

## Si hace falta tocarlo a mano

```
npm install                        # en la raíz, para la web
./scripts/compilar-movil.sh        # deja las pantallas en movil/www
cd movil
npm install
npx cap sync android               # copia www/ y los complementos al proyecto Android
cd android && ./gradlew assembleDebug
```

## Datos que no se cambian

- Identificador del paquete: `com.mycoachruns.app`. Es permanente: cambiarlo es
  una app distinta, con instalación desde cero.
- Los iconos y la pantalla de arranque salen del logo, generados a mano en
  `android/app/src/main/res/`.
