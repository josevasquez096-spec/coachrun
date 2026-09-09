export type Zona = { n: number; nombre: string; min: number; max: number; color: string };

/** Zonas por reserva de frecuencia cardíaca (Karvonen). Si no hay pulso en reposo,
 *  se calcula sobre el porcentaje de la frecuencia máxima. */
export function zonas(maxHr?: number | null, restHr?: number | null): Zona[] | null {
  if (!maxHr || maxHr < 120) return null;
  const rest = restHr && restHr > 30 && restHr < maxHr ? restHr : null;
  const pct = (p: number) => Math.round(rest ? rest + (maxHr - rest) * p : maxHr * p);
  const defs: [number, string, number, number, string][] = [
    [1, 'Recuperación', 0.50, 0.60, '#8FA3B8'],
    [2, 'Aeróbico suave', 0.60, 0.70, '#2E9E6B'],
    [3, 'Aeróbico fuerte', 0.70, 0.80, '#E0A62B'],
    [4, 'Umbral', 0.80, 0.90, '#FF5A1F'],
    [5, 'Máximo', 0.90, 1.00, '#C62F1E'],
  ];
  return defs.map(([n, nombre, a, b, color]) => ({ n, nombre, min: pct(a), max: pct(b), color }));
}

export function zonaDe(hr: number, zs: Zona[] | null): Zona | null {
  if (!zs) return null;
  return zs.find((z) => hr >= z.min && hr <= z.max) ?? (hr > zs[4].max ? zs[4] : hr < zs[0].min ? zs[0] : null);
}

export const RPE_LABEL: Record<number, string> = {
  1: 'Muy suave', 2: 'Suave', 3: 'Cómodo', 4: 'Algo exigente', 5: 'Moderado',
  6: 'Exigente', 7: 'Duro', 8: 'Muy duro', 9: 'Casi máximo', 10: 'Máximo',
};
