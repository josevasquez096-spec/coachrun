import type { Step } from './phases';

/**
 * Reparte metros y segundos entre las fases del entrenamiento.
 *
 * Va aparte y sin efectos secundarios para poder probarlo:
 * `node scripts/probar-reparto.mjs`.
 *
 * El porqué del "bote": al bloquear la pantalla el navegador congela la app.
 * Cuando vuelve, llegan de golpe varios minutos y varios cientos de metros.
 * Sumarlos a la fase actual y adelantar una sola fase tiraba el resto, así que
 * el atleta hacía cinco series y la app seguía en la primera. Aquí el bote se
 * va gastando fase por fase hasta agotarse.
 *
 * Cómo se repartió el tiempo entre las fases que pasaron a oscuras no se puede
 * saber: solo llegan dos totales, metros y segundos. Así que cada fase se cobra
 * en las dos monedas usando **su propio ritmo previsto** (el que puso el coach,
 * o uno por defecto para las recuperaciones). Repartir en proporción al total,
 * que fue el primer intento, se pasaba de largo: daba a las recuperaciones el
 * ritmo medio de las series.
 *
 * Con esto se queda ligeramente corto antes que largo, que es lo que interesa:
 * es mejor que el atleta tenga que saltar una fase a mano que encontrarse el
 * entrenamiento dado por terminado.
 */
export type Reparto = {
  idx: number;        // fase en curso
  stepDist: number;   // metros ya hechos de la fase en curso
  stepTime: number;   // segundos ya hechos de la fase en curso
  boteD: number;      // metros pendientes de repartir
  boteT: number;      // segundos pendientes de repartir
};

/** Segundos por kilómetro que se le suponen a un paso si nadie lo mide. */
function ritmoPrevisto(f: Step) {
  return f.paceHigh ?? f.paceLow ?? (f.kind === 'rest' ? 420 : 330);
}

export function repartir(steps: Step[], e: Reparto): Reparto & { saltos: number } {
  let { idx, stepDist, stepTime, boteD, boteT } = e;
  let saltos = 0;

  if (!steps.length) return { idx, stepDist: stepDist + boteD, stepTime: stepTime + boteT, boteD: 0, boteT: 0, saltos };

  while (idx < steps.length && (boteD > 0 || boteT > 0)) {
    const f = steps[idx];
    const porDistancia = f.mode === 'distance';
    const meta = porDistancia ? f.meters ?? 0 : f.seconds ?? 0;
    const falta = Math.max(0, meta - (porDistancia ? stepDist : stepTime));
    const bote = porDistancia ? boteD : boteT;

    if (bote < falta) {                    // no llega para cerrar esta fase
      stepDist += boteD; stepTime += boteT;
      boteD = 0; boteT = 0;
      break;
    }
    // Lo que cuesta cerrar la fase en la otra moneda, a su ritmo previsto.
    const vel = 1000 / ritmoPrevisto(f);                       // metros por segundo
    const otro = porDistancia ? falta / vel : falta * vel;     // segundos, o metros
    const disponible = porDistancia ? boteT : boteD;
    if (otro > disponible) {                // el otro bote no da: aún no ha pasado
      stepDist += boteD; stepTime += boteT;
      boteD = 0; boteT = 0;
      break;
    }
    if (porDistancia) { boteD -= falta; boteT -= otro; }
    else { boteT -= falta; boteD -= otro; }
    idx += 1; stepDist = 0; stepTime = 0; saltos += 1;
  }

  // Si se acabaron las fases, lo que sobre se queda como carrera libre.
  if (idx >= steps.length) { stepDist += boteD; stepTime += boteT; boteD = 0; boteT = 0; }
  return { idx, stepDist, stepTime, boteD, boteT, saltos };
}
