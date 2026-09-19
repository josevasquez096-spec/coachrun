'use client';
import { MUSCULOS, type Cara } from '@/lib/musculos';

/**
 * El muñeco de frente y espalda, con los músculos marcables.
 *
 * Va en SVG y no como imagen porque hay que **pintar cada grupo por separado**:
 * un PNG no se puede colorear por zonas.
 *
 * Dos decisiones que evitan que quede feo:
 *  - Todo se dibuja **recortado a la silueta** (`clipPath`). Sin eso los
 *    músculos se salían del cuerpo y parecía un robot con pegatinas.
 *  - Solo se define el lado izquierdo; el derecho es el mismo espejado. Así la
 *    simetría sale exacta y hay la mitad de coordenadas que mantener.
 *
 * El rojo es el color de "trabajado", como en Strava. Rompe la norma de la
 * paleta —donde el rojo era solo para mensajes sin leer— y está asumido: el
 * lima sobre el cuerpo gris no se distingue, y el naranja ya significa
 * "te saliste del objetivo".
 */
export const ROJO_MUSCULO = '#E03131';
const PIEL = '#EDEFED';
const MUSCULO = '#C9CEC9';
const LINEA = '#0B0D0B';

/** Mitad izquierda del cuerpo. La derecha se saca espejando esto. */
/**
 * La silueta entera en un solo trazo: cuerpo, brazos, piernas y pies.
 *
 * Es una sola pieza a propósito. Antes era tronco + brazos + piernas por
 * separado y las junturas se veían: una línea negra cruzando la cadera como un
 * cinturón, y el brazo montado sobre el pecho. Con un único contorno no hay
 * costuras que tapar.
 *
 * Se genera espejando la mitad izquierda, así que es simétrica por
 * construcción. Las formas de abajo (BRAZO, PIERNA, TRONCO) ya **no se
 * dibujan**: solo sirven de molde para recortar cada músculo en su sitio.
 */
const SILUETA = 'M 93,60 C 80,60 68,66 60,76 C 52,84 48,96 46,110 L 43,150 C 41,164 39,178 38,192 L 37,210 C 36,220 39,227 44,227 C 49,227 52,220 52,210 L 51,192 C 53,178 55,164 57,150 L 59,112 C 60,103 62,97 66,93 C 70,116 69,150 70,180 L 71,206 C 69,228 70,251 73,271 L 77,301 C 79,323 79,343 78,363 L 78,386 C 74,392 72,398 73,402 L 93,402 C 94,396 93,390 93,386 L 94,360 C 95,340 96,318 97,298 L 98,218 L 100,210 L 102,218 L 103,298 C 104,318 105,340 106,360 L 107,386 C 107,390 106,396 107,402 L 127,402 C 128,398 126,392 122,386 L 122,363 C 121,343 121,323 123,301 L 127,271 C 130,251 131,228 129,206 L 130,180 C 131,150 130,116 134,93 C 138,97 140,103 141,112 L 143,150 C 145,164 147,178 149,192 L 148,210 C 148,220 151,227 156,227 C 161,227 164,220 163,210 L 162,192 C 161,178 159,164 157,150 L 154,110 C 152,96 148,84 140,76 C 132,66 120,60 107,60 Z';

// El brazo arranca justo en el borde del tronco, no por dentro: si se mete,
// se monta sobre el pecho y queda una equis fea.
const BRAZO = 'M60,76 C52,84 48,96 46,110 L43,150 C41,164 39,178 38,192 L37,210 C36,220 39,227 44,227 C49,227 52,220 52,210 L51,192 C53,178 55,164 57,150 L59,112 C60,103 62,97 66,93 C64,87 62,81 60,76 Z';
// El borde interior queda en 97 (y 103 el espejado): deja una rendija entre
// las piernas. Pegadas en el centro parecían una sola pieza.
const PIERNA = 'M71,206 C69,228 70,251 73,271 L77,301 C79,323 79,343 78,363 L78,386 C74,392 72,398 73,402 L93,402 C94,396 93,390 93,386 L94,360 C95,340 96,318 97,298 L98,218 L99,206 Z';
const TRONCO = 'M93,60 C80,60 68,66 60,76 C63,82 65,87 66,93 C70,116 69,150 70,180 L71,208 L129,208 L130,180 C131,150 130,116 134,93 C135,87 137,82 140,76 C132,66 120,60 107,60 Z';

/** Formas de cada grupo, en el lado izquierdo de un lienzo de 200 × 420. */
type Parte = 'tronco' | 'brazo' | 'pierna';
type Forma = { cx: number; cy: number; rx: number; ry: number; rot?: number };
/**
 * En qué parte del cuerpo vive cada grupo. Sirve para recortarlo ahí dentro:
 * así un cuádriceps nunca se derrama sobre el tronco ni un bíceps sobre el
 * pecho, pase lo que pase con las coordenadas.
 */
const PARTE: Record<string, Parte> = {
  hombros: 'tronco', pecho: 'tronco', abdomen: 'tronco', oblicuos: 'tronco',
  trapecio: 'tronco', dorsal: 'tronco', lumbar: 'tronco', gluteos: 'tronco',
  biceps: 'brazo', triceps: 'brazo', antebrazos: 'brazo',
  cuadriceps: 'pierna', aductores: 'pierna', isquios: 'pierna', tibial: 'pierna', gemelos: 'pierna',
};

const FORMAS: Record<string, Forma[]> = {
  // ---------------- de frente
  hombros:    [{ cx: 68, cy: 85, rx: 11, ry: 12 }],
  pecho:      [{ cx: 83, cy: 103, rx: 15, ry: 13 }],
  biceps:     [{ cx: 51, cy: 130, rx: 7, ry: 20 }],
  antebrazos: [{ cx: 45, cy: 182, rx: 7, ry: 24 }],
  abdomen:    [{ cx: 93, cy: 128, rx: 7, ry: 8 }, { cx: 93, cy: 146, rx: 7, ry: 8 }, { cx: 93, cy: 164, rx: 7, ry: 8 }],
  oblicuos:   [{ cx: 76, cy: 150, rx: 6, ry: 20 }],
  cuadriceps: [{ cx: 84, cy: 252, rx: 13, ry: 38 }],
  aductores:  [{ cx: 95, cy: 240, rx: 5, ry: 26 }],
  tibial:     [{ cx: 86, cy: 332, rx: 7, ry: 26 }],
  // ---------------- de espalda
  trapecio:   [{ cx: 85, cy: 90, rx: 15, ry: 16 }],
  dorsal:     [{ cx: 79, cy: 132, rx: 15, ry: 25, rot: -8 }],
  lumbar:     [{ cx: 92, cy: 176, rx: 8, ry: 15 }],
  triceps:    [{ cx: 51, cy: 130, rx: 7, ry: 20 }],
  gluteos:    [{ cx: 83, cy: 192, rx: 15, ry: 13 }],
  isquios:    [{ cx: 84, cy: 258, rx: 13, ry: 34 }],
  gemelos:    [{ cx: 86, cy: 325, rx: 8, ry: 25 }],
};

export default function MapaMusculos({
  marcados, alTocar, tamano = 150, id = 'mm',
}: { marcados: string[]; alTocar?: (id: string) => void; tamano?: number; id?: string }) {

  const cara = (c: Cara) => {
    const k = (n: string) => `${id}-${c}-${n}`;
    const espejo = 'translate(200,0) scale(-1,1)';

    // Las piezas sueltas. El tronco se dibuja DESPUÉS de los brazos para que
    // tape el trozo donde el hombro se solapa: así no hace falta cuadrar las
    // curvas al píxel.
    const cabeza = <><path d="M93,50 h14 v16 h-14 z" /><circle cx={100} cy={33} r={19} /></>;
    // Solo moldes para recortar: no se dibujan.
    const brazos = <><path d={BRAZO} /><path d={BRAZO} transform={espejo} /></>;
    const piernas = <><path d={PIERNA} /><path d={PIERNA} transform={espejo} /></>;
    const tronco = <path d={TRONCO} />;

    const relleno = { fill: PIEL, stroke: LINEA, strokeWidth: 2, strokeLinejoin: 'round' as const };

    return (
      <svg key={c} viewBox="0 0 200 430" width={tamano} height={tamano * 2.15} role="img"
        aria-label={`Cuerpo de ${c}. Marcados: ${marcados.length ? marcados.join(', ') : 'ninguno'}`}>
        <defs>
          <clipPath id={k('tronco')}>{tronco}</clipPath>
          <clipPath id={k('brazo')}>{brazos}</clipPath>
          <clipPath id={k('pierna')}>{piernas}</clipPath>
        </defs>

        {/* 1. el cuerpo, de una pieza y sin costuras */}
        <g {...relleno}>{cabeza}<path d={SILUETA} /></g>

        {/* 3. los músculos, cada uno recortado a su parte */}
        {(['brazo', 'pierna', 'tronco'] as Parte[]).map((parte) => (
          <g key={parte} clipPath={`url(#${k(parte)})`}>
            {MUSCULOS.filter((m) => m.cara === c && PARTE[m.id] === parte).map((m) => {
              const on = marcados.includes(m.id);
              return (
                <g key={m.id} onClick={alTocar ? () => alTocar(m.id) : undefined}
                  style={{ cursor: alTocar ? 'pointer' : 'default' }}>
                  <title>{m.nombre}</title>
                  {FORMAS[m.id]?.map((f, i) => {
                    const giro = f.rot ? `rotate(${f.rot} ${f.cx} ${f.cy})` : '';
                    const uno = (esp: boolean) => (
                      <ellipse key={`${i}-${esp}`} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}
                        transform={`${esp ? espejo + ' ' : ''}${giro}`}
                        fill={on ? ROJO_MUSCULO : MUSCULO} stroke={LINEA} strokeWidth={1.3} />
                    );
                    // Lo que va en el centro (columna abdominal, lumbar) no se espeja.
                    return f.cx > 96 && f.cx < 104 ? uno(false) : [uno(false), uno(true)];
                  })}
                </g>
              );
            })}
          </g>
        ))}

        {/* 4. el contorno otra vez encima, para que la línea del cuerpo mande
            sobre los músculos que le quedan pegados por dentro. */}
        <g fill="none" stroke={LINEA} strokeWidth={2} strokeLinejoin="round">{cabeza}<path d={SILUETA} /></g>

        <text x={100} y={425} textAnchor="middle" fontSize={14} fontWeight={800} fill={LINEA}>
          {c === 'frente' ? 'FRENTE' : 'ESPALDA'}
        </text>
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
      {cara('frente')}{cara('espalda')}
    </div>
  );
}
