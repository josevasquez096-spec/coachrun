export type Phase = {
  id: string;
  name: string;
  kind: 'warmup' | 'active' | 'rest' | 'cooldown';
  mode: 'distance' | 'time';
  meters?: number;
  seconds?: number;
  paceLow?: number;   // seg/km, extremo rápido
  paceHigh?: number;  // seg/km, extremo lento
  times?: number;     // repeticiones del bloque (series)
  rest?: { mode: 'distance' | 'time'; meters?: number; seconds?: number };
};

/** Un paso ya "desplegado": lo que el corredor ejecuta uno tras otro. */
export type Step = {
  name: string; kind: Phase['kind']; mode: 'distance' | 'time';
  meters?: number; seconds?: number; paceLow?: number; paceHigh?: number;
};

export const KIND_LABEL: Record<Phase['kind'], string> = {
  warmup: 'Calentamiento', active: 'Trabajo', rest: 'Recuperación', cooldown: 'Enfriamiento',
};

export function parsePace(s: string): number | undefined {
  const m = s?.trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}
export function fmtPaceStr(sec?: number) {
  if (!sec) return '';
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}

/** Convierte las fases del coach en la lista de pasos que se ejecutan. */
export function expand(phases: Phase[]): Step[] {
  const out: Step[] = [];
  for (const p of phases) {
    const times = Math.max(1, p.times ?? 1);
    for (let i = 0; i < times; i++) {
      out.push({
        name: times > 1 ? `${p.name} (${i + 1}/${times})` : p.name,
        kind: p.kind, mode: p.mode, meters: p.meters, seconds: p.seconds,
        paceLow: p.paceLow, paceHigh: p.paceHigh,
      });
      if (p.rest && i < times - 1) {
        out.push({ name: 'Recuperación', kind: 'rest', mode: p.rest.mode, meters: p.rest.meters, seconds: p.rest.seconds });
      }
    }
  }
  return out;
}

export function totalMeters(phases: Phase[]) {
  return expand(phases).reduce((s, x) => s + (x.mode === 'distance' ? x.meters ?? 0 : 0), 0);
}
export function totalSeconds(phases: Phase[]) {
  return expand(phases).reduce((s, x) => {
    if (x.mode === 'time') return s + (x.seconds ?? 0);
    const pace = x.paceHigh ?? x.paceLow ?? 330;
    return s + ((x.meters ?? 0) / 1000) * pace;
  }, 0);
}

export function describe(p: Phase) {
  const dur = p.mode === 'distance'
    ? (p.meters! >= 1000 ? `${(p.meters! / 1000).toFixed(p.meters! % 1000 ? 2 : 0)} km` : `${p.meters} m`)
    : `${Math.round((p.seconds ?? 0) / 60)} min`;
  const pace = p.paceLow || p.paceHigh ? ` a ${fmtPaceStr(p.paceLow)}–${fmtPaceStr(p.paceHigh)} /km` : '';
  const rest = p.rest ? ` con ${p.rest.mode === 'time' ? `${Math.round((p.rest.seconds ?? 0) / 60)}'` : `${p.rest.meters} m`} de recuperación` : '';
  const times = (p.times ?? 1) > 1 ? `${p.times}× ` : '';
  return `${times}${dur}${pace}${rest}`;
}
