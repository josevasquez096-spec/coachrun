export const fmtPace = (secPerKm: number) => !isFinite(secPerKm) || secPerKm <= 0 ? '--:--' : `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}`;
export const fmtTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? `${h}:` : '') + `${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
/**
 * Los tipos de entrenamiento que puede asignar el coach.
 *
 * El orden importa: es el que se ve en el desplegable. Las claves son las
 * mismas que la lista `workout_type` de Postgres, así que **añadir una aquí
 * sin ampliarla también en la base de datos hace que guardar falle**
 * (ver `supabase/migration-v6.sql`).
 */
export const TYPE_LABEL: Record<string, string> = {
  easy: 'Rodaje suave', long: 'Fondo', tempo: 'Tempo', intervals: 'Series',
  trail: 'Trail', walk: 'Caminata', race: 'Carrera', strength: 'Fuerza', rest: 'Descanso',
};

/**
 * De qué se mueve uno en cada tipo, que es lo que decide cómo se graba y cómo
 * se enseña. `strength` y `rest` no se graban con GPS; el resto sí.
 */
export const DEPORTE: Record<string, 'run' | 'walk' | 'trail' | 'strength' | 'rest'> = {
  easy: 'run', long: 'run', tempo: 'run', intervals: 'run', race: 'run',
  trail: 'trail', walk: 'walk', strength: 'strength', rest: 'rest',
};

/**
 * Lo que el atleta puede elegir en la pantalla de Iniciar. Es más corto que la
 * lista del coach a propósito: al salir a la calle lo que importa es si vas
 * corriendo, caminando o por monte, no si es tempo o series (eso ya lo dice el
 * entrenamiento asignado).
 */
export const DEPORTE_LABEL: Record<string, string> = {
  run: 'Correr', walk: 'Caminata', trail: 'Trail', strength: 'Fuerza', rest: 'Descanso',
};

/**
 * Se probó con emojis y se quitaron: cada teléfono los dibuja distinto y al
 * lado de los iconos de línea de la barra quedaban como pegatinas de colores.
 * El nombre del deporte ya se lee al lado, que es lo que hace falta.
 */
export const DEPORTE_ICONO: Record<string, string> = {
  run: '', walk: '', trail: '', strength: '', rest: '',
};

/** El deporte de una actividad ya grabada, con los valores viejos a salvo. */
export const deporteDe = (tipo?: string | null): string => {
  if (!tipo) return 'run';                       // lo de antes de la v6 era correr
  return DEPORTE[tipo] ?? (tipo in DEPORTE_LABEL ? tipo : 'run');
};

/** Fecha de hoy en la zona horaria del dispositivo (no UTC). */
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const dateOffset = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
