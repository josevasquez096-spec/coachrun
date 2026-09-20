/**
 * Los músculos que el coach puede marcar en un entrenamiento de fuerza.
 *
 * El dibujo es **por partes a propósito**: una imagen plana (el PNG de
 * referencia) no se puede colorear por zonas. Cada grupo es una o dos formas
 * en el SVG de `components/MapaMusculos.tsx`, y su `id` es lo que se guarda en
 * `workouts.muscles` / `activities.muscles`.
 *
 * Los `id` NO se cambian una vez usados: hay entrenamientos guardados que los
 * llevan dentro. Para renombrar algo, se cambia el `nombre`, no el `id`.
 */
export type Cara = 'frente' | 'espalda';
export type Musculo = { id: string; nombre: string; cara: Cara };

export const MUSCULOS: Musculo[] = [
  // ---- de frente
  { id: 'pecho',      nombre: 'Pecho',          cara: 'frente' },
  { id: 'hombros',    nombre: 'Hombros',        cara: 'frente' },
  { id: 'biceps',     nombre: 'Bíceps',         cara: 'frente' },
  { id: 'antebrazos', nombre: 'Antebrazos',     cara: 'frente' },
  { id: 'abdomen',    nombre: 'Abdominales',    cara: 'frente' },
  { id: 'oblicuos',   nombre: 'Oblicuos',       cara: 'frente' },
  { id: 'cuadriceps', nombre: 'Cuádriceps',     cara: 'frente' },
  { id: 'aductores',  nombre: 'Aductores',      cara: 'frente' },
  { id: 'tibial',     nombre: 'Tibial',         cara: 'frente' },
  // ---- de espalda
  { id: 'trapecio',   nombre: 'Trapecio',       cara: 'espalda' },
  { id: 'dorsal',     nombre: 'Dorsal',         cara: 'espalda' },
  { id: 'lumbar',     nombre: 'Lumbar',         cara: 'espalda' },
  { id: 'triceps',    nombre: 'Tríceps',        cara: 'espalda' },
  { id: 'gluteos',    nombre: 'Glúteos',        cara: 'espalda' },
  { id: 'isquios',    nombre: 'Isquiotibiales', cara: 'espalda' },
  { id: 'gemelos',    nombre: 'Gemelos',        cara: 'espalda' },
];

export const NOMBRE = Object.fromEntries(MUSCULOS.map((m) => [m.id, m.nombre])) as Record<string, string>;

/** Los nombres de una lista de ids, en el orden del dibujo y sin inventados. */
export const nombresDe = (ids?: string[] | null): string[] =>
  MUSCULOS.filter((m) => ids?.includes(m.id)).map((m) => m.nombre);

// ---------------------------------------------------------------- el dibujo

/**
 * Cuánto mide de ancho cada dibujo cuando el alto es 400. No son iguales.
 */
export const ANCHO: Record<Cara, number> = { frente: 225, espalda: 196 };
/** El eje de simetría de cada dibujo: lo que cae encima no se espeja. */
export const EJE: Record<Cara, number> = { frente: 112.5, espalda: 98 };

export type Mancha = { cx: number; cy: number; rx: number; ry: number };

/**
 * Dónde cae cada grupo en su dibujo, medido sobre el propio cuerpo con una
 * rejilla. Viven aquí y no en el componente porque los usan dos sitios: el
 * selector en pantalla y la imagen que se genera para compartir. Tenerlos
 * duplicados era garantía de que un día dejaran de coincidir.
 *
 * Si se cambian las imágenes de `public/musculos/`, hay que volver a medirlo.
 */
export const MANCHAS: Record<string, Mancha[]> = {
  hombros:    [{ cx: 71, cy: 90, rx: 13, ry: 17 }],
  pecho:      [{ cx: 100, cy: 93, rx: 12, ry: 16 }],
  biceps:     [{ cx: 62, cy: 138, rx: 12, ry: 26 }],
  antebrazos: [{ cx: 60, cy: 190, rx: 13, ry: 28 }],
  abdomen:    [{ cx: 112.5, cy: 150, rx: 17, ry: 40 }],
  oblicuos:   [{ cx: 90, cy: 163, rx: 8, ry: 25 }],
  cuadriceps: [{ cx: 97, cy: 250, rx: 16, ry: 43 }],
  aductores:  [{ cx: 107, cy: 235, rx: 7, ry: 30 }],
  tibial:     [{ cx: 97, cy: 330, rx: 10, ry: 31 }],
  trapecio:   [{ cx: 98, cy: 88, rx: 33, ry: 28 }],
  dorsal:     [{ cx: 78, cy: 133, rx: 18, ry: 31 }],
  lumbar:     [{ cx: 98, cy: 168, rx: 14, ry: 19 }],
  triceps:    [{ cx: 52, cy: 138, rx: 12, ry: 26 }],
  gluteos:    [{ cx: 85, cy: 205, rx: 14, ry: 20 }],
  isquios:    [{ cx: 86, cy: 255, rx: 15, ry: 36 }],
  gemelos:    [{ cx: 88, cy: 320, rx: 11, ry: 29 }],
};

/** Las posiciones de un grupo: dos (izquierda y derecha) o una si va en el eje. */
export const lados = (f: Mancha, eje: number): number[] =>
  Math.abs(f.cx - eje) < 2 ? [f.cx] : [f.cx, 2 * eje - f.cx];

/** En qué dibujo está cada grupo. */
export const CARA_DE = Object.fromEntries(MUSCULOS.map((m) => [m.id, m.cara])) as Record<string, Cara>;
