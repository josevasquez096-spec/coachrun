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
  hrZone?: number;    // zona de pulso objetivo (1-5), alternativa al ritmo
  times?: number;     // repeticiones del bloque (series)
  rest?: Rest;        // recuperación entre repeticiones
  restAfter?: boolean; // incluir recuperación también tras la última repetición
};

export type Step = {
  name: string; kind: Phase['kind']; mode: 'distance' | 'time';
  meters?: number; seconds?: number; paceLow?: number; paceHigh?: number; hrZone?: number;
  fase?: number;   // posición de la fase del coach de la que salió este paso
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
  phases.forEach((p, fase) => {
    const times = Math.max(1, p.times ?? 1);
    for (let i = 0; i < times; i++) {
      out.push({
        name: times > 1 ? `${p.name} ${i + 1}/${times}` : p.name,
        kind: p.kind, mode: p.mode, meters: p.meters, seconds: p.seconds,
        paceLow: p.paceLow, paceHigh: p.paceHigh, hrZone: p.hrZone, fase,
      });
      const isLast = i === times - 1;
      if (p.rest && (!isLast || p.restAfter)) {
        out.push({
          name: p.rest.name || (p.rest.activo === false ? 'Pausa' : 'Recuperación'),
          kind: 'rest', mode: p.rest.mode, meters: p.rest.meters, seconds: p.rest.seconds, fase,
        });
      }
    }
  });
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
  const zona = p.hrZone ? ` · zona ${p.hrZone}` : '';
  const times = (p.times ?? 1) > 1 ? `${p.times}× ` : '';
  const rest = p.rest
    ? ` · recuperación ${fmtAmount(p.rest.mode, p.rest.meters, p.rest.seconds)}${p.rest.activo === false ? ' parado' : ''}` : '';
  return `${times}${dur}${pace}${zona}${rest}`;
}

/** Un ritmo tal como se dicta: "3:30" la voz lo lee raro, "3 30" lo lee bien. */
export function dictarRitmo(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return s === 0 ? `${m} minutos` : `${m} ${String(s).padStart(2, '0')}`;
}

/** El objetivo de un paso, en palabras y completo (antes solo decía un extremo). */
export function dictarObjetivo(s: Step) {
  if (s.paceLow && s.paceHigh && s.paceLow !== s.paceHigh)
    return `, a ritmo entre ${dictarRitmo(s.paceLow)} y ${dictarRitmo(s.paceHigh)} por kilómetro`;
  const uno = s.paceLow || s.paceHigh;
  if (uno) return `, a ritmo de ${dictarRitmo(uno)} por kilómetro`;
  if (s.hrZone) return `, en zona ${s.hrZone} de pulso`;
  return '';
}

/** La cantidad de un paso, en palabras. */
export function dictarCantidad(s: Step) {
  if (s.mode === 'distance') {
    const m = s.meters ?? 0;
    if (m >= 1000) { const km = m / 1000; return `${km % 1 === 0 ? km : km.toFixed(1).replace('.', ' coma ')} kilómetros`; }
    return `${m} metros`;
  }
  const seg = s.seconds ?? 0;
  if (seg < 60) return `${seg} segundos`;
  const min = Math.floor(seg / 60), resto = seg % 60;
  const mm = `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  return resto ? `${mm} y ${resto} segundos` : mm;
}
