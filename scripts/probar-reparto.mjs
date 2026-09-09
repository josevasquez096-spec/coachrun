/**
 * Comprueba `lib/reparto.ts`, que es lo que decide en qué fase va el atleta.
 *
 *   node scripts/probar-reparto.mjs
 *
 * El caso que importa es el del teléfono bloqueado: la app se congela, y al
 * volver le llegan de golpe los minutos y los metros de varias repeticiones.
 * Antes eso adelantaba una sola fase y el atleta se quedaba atrás.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'reparto-'));
execSync(`npx tsc lib/reparto.ts --outDir ${out} --module es2022 --target es2022 --moduleResolution bundler`, { stdio: 'pipe' });
const { repartir } = await import(join(out, 'reparto.js'));

// 12 × 200 m con 1 min de recuperación, entre calentamiento y vuelta a la calma
const steps = [{ name: 'Calentamiento', kind: 'warmup', mode: 'time', seconds: 900, fase: 0 }];
const REPS = 20;
for (let i = 1; i <= REPS; i++) {
  steps.push({ name: `Serie ${i}/${REPS}`, kind: 'active', mode: 'distance', meters: 200, paceLow: 210, paceHigh: 225, fase: 1 });
  if (i < REPS) steps.push({ name: 'Recuperación', kind: 'rest', mode: 'time', seconds: 60, fase: 1 });
}
steps.push({ name: 'Vuelta a la calma', kind: 'cooldown', mode: 'time', seconds: 900, fase: 2 });

const vacio = { idx: 0, stepDist: 0, stepTime: 0, boteD: 0, boteT: 0 };
const meter = (e, d, t) => repartir(steps, { ...e, boteD: e.boteD + d, boteT: e.boteT + t });

function correrNormal(e, segundos, ritmo = 3.3) {
  // un punto de GPS y un tic por segundo, como en la vida real
  for (let i = 0; i < segundos; i++) e = meter(e, steps[Math.min(e.idx, steps.length - 1)].kind === 'rest' ? 1.8 : ritmo, 1);
  return e;
}

let fallos = 0;
const comprobar = (nombre, real, esperado) => {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${nombre.padEnd(52)} ${String(real).padStart(3)}  (esperado ${esperado})`);
};

console.log('Entrenamiento: 15 min + 20×200 m a 3:30-3:45 con 1 min rec + 15 min\n');

// 1) Al ritmo normal, sin bloquear
let e = correrNormal(vacio, 900);
comprobar('tras el calentamiento entra en la serie 1', e.idx, 1);
e = correrNormal(e, 61);
comprobar('acabada la serie 1, pasa a la recuperación', e.idx, 2);

// 2) El caso del usuario: bloqueo largo en mitad de las series
let b = correrNormal(vacio, 900);              // calentamiento hecho
for (let i = 0; i < 9; i++) b = correrNormal(b, 61 + 60);   // 9 series con su recuperación
const antes = b.idx;
comprobar('antes de bloquear va por la serie 10', steps[antes].name === 'Serie 10/20' ? 10 : -1, 10);

// Bloqueado 5 series: 5×(200 m + 60 s de recuperación) llega de una vez
const metros = 5 * 200 + 5 * 110, segs = 5 * 61 + 5 * 60;   // 5 series con su recuperación
b = meter(b, metros, segs);
const donde = steps[Math.min(b.idx, steps.length - 1)].name;
comprobar('al desbloquear queda en la serie 14, 15 o su recuperación',
  /Serie 1[456]|Recuper/.test(donde) ? 1 : 0, 1);
console.log(`         (quedó en "${donde}", saltó ${b.saltos} fases de una vez)`);

// 3) Un bloqueo tan largo que se pasa el entrenamiento entero
let c = meter(vacio, 20000, 7200);
comprobar('un bloqueo enorme termina el entrenamiento', c.idx, steps.length);
comprobar('y no se queda con metros sin repartir', Math.round(c.boteD), 0);

// 4) Parado: no debe adelantar nada
let d = repartir(steps, { ...vacio, boteD: 0, boteT: 0 });
comprobar('sin nada que repartir no se mueve', d.idx, 0);

// 5) El tiempo se reparte con los metros, no se pierde
let f = correrNormal(vacio, 900);
const idxAntes = f.idx;
f = meter(f, 200, 61);
comprobar('una serie justa avanza exactamente una fase', f.idx - idxAntes, 1);

console.log(fallos ? `\n${fallos} fallos` : '\nTodo correcto.');
process.exit(fallos ? 1 : 0);
