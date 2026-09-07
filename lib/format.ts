export const fmtPace = (secPerKm: number) => !isFinite(secPerKm) || secPerKm <= 0 ? '--:--' : `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}`;
export const fmtTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? `${h}:` : '') + `${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
export const TYPE_LABEL: Record<string, string> = { easy: 'Rodaje suave', long: 'Fondo', tempo: 'Tempo', intervals: 'Series', race: 'Carrera', rest: 'Descanso', strength: 'Fuerza' };
