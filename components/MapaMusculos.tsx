'use client';
import { MUSCULOS, type Cara } from '@/lib/musculos';

/**
 * El muñeco de frente y espalda, con los músculos marcables.
 *
 * El cuerpo es **el dibujo del propio proyecto** (`public/musculos/`), no un
 * dibujo hecho a mano con formas: intentarlo así quedaba como un robot con
 * pegatinas. Encima se pintan manchas rojas, y el truco que hace que quede
 * bien es `mix-blend-mode: multiply`:
 *
 *  - Rojo × gris claro (el músculo) = rojo. Se ve marcado.
 *  - Rojo × negro (los contornos del dibujo) = negro. Las líneas siguen ahí.
 *
 * O sea que **los contornos del dibujo hacen de molde solos** y las manchas no
 * necesitan calcar cada músculo: basta con que cubran la zona.
 *
 * La máscara (`*-mascara.png`, el cuerpo en blanco sobre negro) impide que el
 * rojo se salga por fuera de la silueta.
 *
 * El rojo rompe la norma de la paleta, donde era solo para mensajes sin leer.
 * Asumido: es lo que pidió el dueño y lo que hace Strava.
 */
export const ROJO_MUSCULO = '#E5332A';

/** Ancho de cada dibujo cuando el alto es 400. Son distintos entre sí. */
const ANCHO: Record<Cara, number> = { frente: 225, espalda: 196 };
const EJE: Record<Cara, number> = { frente: 112.5, espalda: 98 };

type Mancha = { cx: number; cy: number; rx: number; ry: number; rot?: number };

/**
 * Dónde cae cada grupo en su dibujo, leído sobre el propio cuerpo con una
 * rejilla. Si se cambian las imágenes de `public/musculos/`, hay que volver a
 * medirlos.
 */
const MANCHAS: Record<string, Mancha[]> = {
  // ---- frente (225 de ancho, eje en 112,5)
  hombros:    [{ cx: 71, cy: 90, rx: 13, ry: 17 }],
  pecho:      [{ cx: 100, cy: 93, rx: 12, ry: 16 }],
  biceps:     [{ cx: 62, cy: 138, rx: 12, ry: 26 }],
  antebrazos: [{ cx: 60, cy: 190, rx: 13, ry: 28 }],
  abdomen:    [{ cx: 112.5, cy: 150, rx: 17, ry: 40 }],
  oblicuos:   [{ cx: 90, cy: 163, rx: 8, ry: 25 }],
  cuadriceps: [{ cx: 97, cy: 250, rx: 16, ry: 43 }],
  aductores:  [{ cx: 107, cy: 235, rx: 7, ry: 30 }],
  tibial:     [{ cx: 97, cy: 330, rx: 10, ry: 31 }],
  // ---- espalda (196 de ancho, eje en 98)
  trapecio:   [{ cx: 98, cy: 88, rx: 33, ry: 28 }],
  dorsal:     [{ cx: 78, cy: 133, rx: 18, ry: 31 }],
  lumbar:     [{ cx: 98, cy: 168, rx: 14, ry: 19 }],
  triceps:    [{ cx: 52, cy: 138, rx: 12, ry: 26 }],
  gluteos:    [{ cx: 85, cy: 205, rx: 14, ry: 20 }],
  isquios:    [{ cx: 86, cy: 255, rx: 15, ry: 36 }],
  gemelos:    [{ cx: 88, cy: 320, rx: 11, ry: 29 }],
};

export default function MapaMusculos({
  marcados, alTocar, alto = 300, id = 'mm',
}: { marcados: string[]; alTocar?: (id: string) => void; alto?: number; id?: string }) {

  const cara = (c: Cara) => {
    const w = ANCHO[c], eje = EJE[c];
    const clave = `${id}-${c}`;

    return (
      <svg key={c} viewBox={`0 0 ${w} 400`} height={alto} width={(alto * w) / 400} role="img"
        aria-label={`Cuerpo de ${c}`} style={{ touchAction: 'manipulation' }}>
        <defs>
          {/* el cuerpo en blanco sobre negro: el rojo solo pinta donde es blanco */}
          <mask id={`${clave}-m`}>
            <image href={`/musculos/${c}-mascara.png`} x={0} y={0} width={w} height={400} />
          </mask>
        </defs>

        <image href={`/musculos/${c}.png`} x={0} y={0} width={w} height={400} />

        <g mask={`url(#${clave}-m)`} style={{ mixBlendMode: 'multiply' }}>
          {MUSCULOS.filter((m) => m.cara === c).map((m) => {
            if (!marcados.includes(m.id)) return null;
            return (MANCHAS[m.id] ?? []).map((f, i) => {
              const giro = f.rot ? `rotate(${f.rot} ${f.cx} ${f.cy})` : '';
              const uno = (esp: boolean) => (
                <ellipse key={`${m.id}-${i}-${esp}`} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
                  transform={`${esp ? `translate(${2 * eje},0) scale(-1,1) ` : ''}${giro}`}
                  fill={ROJO_MUSCULO} />
              );
              // Lo que cae en el eje (abdomen, lumbar, trapecio) no se espeja.
              return Math.abs(f.cx - eje) < 2 ? uno(false) : [uno(false), uno(true)];
            });
          })}
        </g>

        {/* Zonas para tocar. Van encima y transparentes: se tocan igual estén
            marcadas o no, y no estorban al dibujo. */}
        {alTocar && MUSCULOS.filter((m) => m.cara === c).map((m) =>
          (MANCHAS[m.id] ?? []).map((f, i) => {
            const uno = (esp: boolean) => (
              <ellipse key={`t-${m.id}-${i}-${esp}`} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
                transform={esp ? `translate(${2 * eje},0) scale(-1,1)` : undefined}
                fill="transparent" style={{ cursor: 'pointer' }}
                onClick={() => alTocar(m.id)}><title>{m.nombre}</title></ellipse>
            );
            return Math.abs(f.cx - eje) < 2 ? uno(false) : [uno(false), uno(true)];
          }))}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {cara('frente')}{cara('espalda')}
    </div>
  );
}
