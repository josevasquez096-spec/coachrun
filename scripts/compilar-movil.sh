#!/usr/bin/env bash
# Prepara la web para que viaje dentro del APK.
#
#   ./scripts/compilar-movil.sh [direccion-del-servidor]
#
# Deja en movil/www/ las pantallas como archivos sueltos. Las rutas de servidor
# NO se pueden empaquetar (necesitan un servidor que las ejecute), asi que se
# apartan un momento, se compila, y se devuelven a su sitio. Se quedan en Vercel
# y la app las llama por internet.
set -euo pipefail

BASE="${1:-https://coachrun-delta.vercel.app}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

GUARDA="$(mktemp -d)"
devolver() {
  [ -d "$GUARDA/api" ] && mv "$GUARDA/api" app/api
  [ -d "$GUARDA/callback" ] && mv "$GUARDA/callback" app/auth/callback
  return 0
}
trap devolver EXIT      # pase lo que pase, las rutas vuelven a su sitio

echo "→ Apartando las rutas de servidor"
mv app/api "$GUARDA/api"
mv app/auth/callback "$GUARDA/callback"

echo "→ Compilando las pantallas (servidor: $BASE)"
APP_MOVIL=1 NEXT_PUBLIC_API_URL="$BASE" npx next build

echo "→ Copiando a movil/www"
rm -rf movil/www && mkdir -p movil/www
cp -r out/. movil/www/

# La pantalla de diagnostico del GPS se conserva en /prueba/: costo cinco
# salidas a la calle averiguar lo que mide, y sigue siendo util si algo falla.
echo "→ Añadiendo la pantalla de diagnóstico en /prueba/"
mkdir -p movil/www/prueba
cp movil/prueba/index.html movil/www/prueba/index.html
(cd movil && npx esbuild src/app.js --bundle --format=iife --target=es2019 --minify --outfile=www/prueba/app.js)

echo "✓ Listo: movil/www"
