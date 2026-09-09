/**
 * Comprueba el filtro de distancia de `lib/geo.ts` con carreras inventadas.
 *
 * Se ejecuta con:  node scripts/simular-gps.mjs
 *
 * Simula el temblor del GPS (ruido gaussiano alrededor del recorrido real) en
 * varias situaciones y compara los metros que mediría la app con los reales.
 * Sirve para no volver a tocar el peso ni el umbral a ojo: si se cambian, esta
 * tabla dice enseguida si se marca de más o de menos, y en qué caso.
 */
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// --- el filtro, igual que en lib/geo.ts ---
const ACC_MAX = 30, V_MAX = 12;
function medirTraza(pts) {
  let suave = null, ancla = null, ultimo = null, total = 0;
  for (const p of pts) {
    const acc = p.acc ?? 0;
    if (acc > ACC_MAX) continue;
    if (ultimo) {
      const dt = Math.max(0.5, (p.t - ultimo.t) / 1000);
      if (hav(ultimo, p) / dt > V_MAX) continue;
    }
    ultimo = p;
    const peso = 1 / (1 + Math.max(acc, 3) / 5);
    suave = !suave ? { ...p } : {
      lat: suave.lat + (p.lat - suave.lat) * peso,
      lng: suave.lng + (p.lng - suave.lng) * peso, t: p.t, acc,
    };
    if (!ancla) { ancla = { ...suave }; continue; }
    const d = hav(ancla, suave);
    if (d >= Math.min(15, Math.max(8, acc * 1.5))) { total += d; ancla = { ...suave }; }
  }
  if (ancla && suave) total += hav(ancla, suave);   // el tramo que quedó a medias
  return total;
}

// --- generador de carreras con ruido ---
let guardado = null;
function gauss() {
  if (guardado !== null) { const v = guardado; guardado = null; return v; }
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  const m = Math.sqrt(-2 * Math.log(u));
  guardado = m * Math.sin(2 * Math.PI * v);
  return m * Math.cos(2 * Math.PI * v);
}
const M_LAT = 1 / 111320;
function traza({ segundos, vel, acc, ruido, radio = 0 }) {
  const lat0 = 18.48, lng0 = -69.93, M_LNG = 1 / (111320 * Math.cos(toR(lat0)));
  const pts = []; let real = 0, x = 0, y = 0, ang = 0;
  for (let i = 0; i <= segundos; i++) {
    if (i > 0) {
      if (radio) ang += vel / radio;
      const dx = vel * Math.cos(ang), dy = vel * Math.sin(ang);
      x += dx; y += dy; real += Math.hypot(dx, dy);
    }
    pts.push({ lat: lat0 + (y + gauss() * ruido) * M_LAT, lng: lng0 + (x + gauss() * ruido) * M_LNG, t: 17e11 + i * 1000, acc });
  }
  return { pts, real };
}

// `ruido` es el temblor real; `acc` lo que el teléfono dice que mide.
const casos = [
  ['Paseo corto 150 m',        { segundos: 97,  vel: 1.55, acc: 8,  ruido: 4 }],
  ['Parado 3 minutos',         { segundos: 180, vel: 0,    acc: 8,  ruido: 4 }],
  ['Parado, señal ±15 m',      { segundos: 180, vel: 0,    acc: 15, ruido: 7 }],
  ['Caminando 10 min',         { segundos: 600, vel: 0.8,  acc: 8,  ruido: 4 }],
  ['Trote 10 min en recto',    { segundos: 600, vel: 3.33, acc: 6,  ruido: 3 }],
  ['Trote, señal buena ±4 m',  { segundos: 600, vel: 3.33, acc: 4,  ruido: 2 }],
  ['Pista de 400 m',           { segundos: 600, vel: 3.33, acc: 6,  ruido: 3, radio: 36.5 }],
  ['Bucle de parque de 126 m', { segundos: 600, vel: 3.0,  acc: 6,  ruido: 3, radio: 20 }],
  ['Bucle muy cerrado de 63 m',{ segundos: 600, vel: 2.5,  acc: 6,  ruido: 3, radio: 10 }],
  ['Serie a 5 m/s',            { segundos: 180, vel: 5,    acc: 5,  ruido: 2.5 }],
  ['Señal mala ±20 m',         { segundos: 600, vel: 3.33, acc: 20, ruido: 10 }],
];

const N = 150;
console.log('caso'.padEnd(28) + 'real'.padStart(9) + 'medido'.padStart(10) + 'error'.padStart(9));
for (const [nombre, cfg] of casos) {
  let real = 0, medido = 0;
  for (let i = 0; i < N; i++) { const r = traza(cfg); real += r.real; medido += medirTraza(r.pts); }
  real /= N; medido /= N;
  const err = real > 1 ? `${medido >= real ? '+' : ''}${((medido / real - 1) * 100).toFixed(1)}%` : `${medido.toFixed(0)} m`;
  console.log(nombre.padEnd(28) + `${real.toFixed(0)} m`.padStart(9) + `${medido.toFixed(0)} m`.padStart(10) + err.padStart(9));
}
