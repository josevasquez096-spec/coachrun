export type Rest = {
  mode: 'distance' | 'time';
  meters?: number;
  seconds?: number;
  name?: string;
  activo?: boolean; // trote suave (true) o parada (false)
};

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
  rest?: Rest;        // recuperación entre repeticiones
  restAfter?: boolean; // incluir recuperación también tras la última repetición
};

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
export function fmtAmount(mode: 'distance' | 'time', meters?: number, seconds?: number) {
  if (mode === 'distance') {
    const m = meters ?? 0;
    return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 2 : 0)} km` : `${m} m`;
  }
  const s = seconds ?? 0;
  return s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`;
}

/** Convierte las fases del coach en la lista de pasos que se ejecutan uno tras otro. */
export function expand(phases: Phase[]): Step[] {
  const out: Step[] = [];
  for (const p of phases) {
    const times = Math.max(1, p.times ?? 1);
    for (let i = 0; i < times; i++) {
      out.push({
        name: times > 1 ? `${p.name} ${i + 1}/${times}` : p.name,
        kind: p.kind, mode: p.mode, meters: p.meters, seconds: p.seconds,
        paceLow: p.paceLow, paceHigh: p.paceHigh,
      });
      const isLast = i === times - 1;
      if (p.rest && (!isLast || p.restAfter)) {
        out.push({
          name: p.rest.name || (p.rest.activo === false ? 'Pausa' : 'Recuperación'),
          kind: 'rest', mode: p.rest.mode, meters: p.rest.meters, seconds: p.rest.seconds,
        });
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
    const pace = x.paceHigh ?? x.paceLow ?? (x.kind === 'rest' ? 420 : 330);
    return s + ((x.meters ?? 0) / 1000) * pace;
  }, 0);
}

export function describe(p: Phase) {
  const dur = fmtAmount(p.mode, p.meters, p.seconds);
  const pace = p.paceLow || p.paceHigh
    ? ` a ${[fmtPaceStr(p.paceLow), fmtPaceStr(p.paceHigh)].filter(Boolean).join('–')} /km` : '';
  const times = (p.times ?? 1) > 1 ? `${p.times}× ` : '';
  const rest = p.rest
    ? ` · recuperación ${fmtAmount(p.rest.mode, p.rest.meters, p.rest.seconds)}${p.rest.activo === false ? ' parado' : ''}` : '';
  return `${times}${dur}${pace}${rest}`;
}
