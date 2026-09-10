# MyCoachRuns en Android

Cáscara de Android hecha con Capacitor. Está **aparte del proyecto web a propósito**:
Vercel compila la raíz del repositorio y no debe arrastrar estas dependencias.

## Qué es esto ahora mismo

Una **app de prueba**, no la app final. Su único trabajo es responder a dos preguntas
antes de comprometernos con el camino largo:

1. ¿Puede medir con la pantalla apagada? (`www/index.html`, que usa el GPS nativo
   en segundo plano a través de un servicio en primer plano de Android.)
2. Cuando la cáscara carga la web desde internet en vez de llevarla dentro,
   ¿sigue llegando al GPS nativo? Hay un fallo conocido por el que no
   (ionic-team/capacitor#2373). El botón "Abrir la app web" lo comprueba: en la
   web sale un distintivo abajo a la izquierda (`components/PuenteNativo.tsx`)
   que dice si el puente funciona.

De la respuesta a la 2 depende cuánto trabajo queda:

- **Si funciona:** casi nada. La app carga la web y le presta el GPS bueno.
- **Si no funciona:** hay que decidir entre convertir la web para que viaje dentro
  del APK (un solo código, sigue siendo web dentro de una caja) o hacer app nativa
  aparte (mejor GPS, dos códigos que mantener).

## `registerPlugin` no viene con Android (esto ya nos mordió)

La primera versión llevaba el guion suelto dentro del HTML y la app arrancaba,
pero al tocar Empezar salía:

    window.Capacitor.registerPlugin is not a function

Android inyecta un `window.Capacitor` mínimo (sirve para saber la plataforma),
pero **la función para cargar complementos la trae la librería
`@capacitor/core` y hay que empaquetarla dentro de la página**. Por eso el guion
vive en `src/app.js` y se empaqueta con esbuild (`npm run build`) antes de
`cap sync`. Si alguna vez se vuelve a escribir JavaScript suelto en `www/`, el
mismo fallo vuelve.

## El filtro de distancia está duplicado

`www/index.html` lleva una copia en JavaScript de `medir()` de `lib/geo.ts`, porque
esta página no pasa por el compilador del proyecto web. **Si allí se cambian el peso
o el umbral, hay que cambiarlos aquí también**, o la prueba deja de medir lo mismo
que la app.

## Cómo se compila

No hace falta ningún computador con Android Studio. Lo hace GitHub en la nube:
`.github/workflows/apk.yml`. Se lanza solo al tocar `movil/`, o a mano desde la
pestaña **Actions** del repositorio. El APK queda en **Releases**, con enlace
público, siempre en la misma entrega (`apk-prueba`) para que el enlace no cambie.

Va firmado con la clave de pruebas de Android, así que **para instalar una versión
nueva hay que desinstalar la anterior**. Cuando pasemos a la app de verdad habrá
que crear una clave propia, guardarla en los secretos del repositorio y no
perderla nunca: si se pierde, las actualizaciones dejan de instalarse encima.

## Si hace falta tocarlo a mano

```
cd movil
npm install
npx cap sync android          # copia www/ y los complementos al proyecto Android
cd android && ./gradlew assembleDebug
```

## Datos que no se cambian

- Identificador del paquete: `com.mycoachruns.app`. Es permanente: cambiarlo es
  una app distinta, con instalación desde cero.
- Los iconos y la pantalla de arranque salen del logo, generados a mano en
  `android/app/src/main/res/`.
