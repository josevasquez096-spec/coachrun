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
