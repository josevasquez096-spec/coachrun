export const fmtPace = (secPerKm: number) => !isFinite(secPerKm) || secPerKm <= 0 ? '--:--' : `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}`;
export const fmtTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? `${h}:` : '') + `${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
export const TYPE_LABEL: Record<string, string> = { easy: 'Rodaje suave', long: 'Fondo', tempo: 'Tempo', intervals: 'Series', race: 'Carrera', rest: 'Descanso', strength: 'Fuerza' };

/** Fecha de hoy en la zona horaria del dispositivo (no UTC). */
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const dateOffset = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
