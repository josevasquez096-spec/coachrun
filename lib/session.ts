'use client';
/**
 * Motor de grabación de la carrera.
 *
 * Vive FUERA de React, en el módulo, a propósito: así la grabación sigue viva
 * aunque el atleta cambie de pestaña dentro de la app. Antes el cronómetro y el
 * GPS colgaban del componente `Recorder`, y al salir de "Grabar" el componente
 * se destruía y con él la carrera entera.
 *
 * La pantalla se limita a mirar: se suscribe con `suscribir()` y lee con `leer()`.
 * Además se guarda una copia en el teléfono cada pocos segundos, para que un
 * cierre de la app tampoco borre lo que llevaba corrido.
 */
import { cerrar, filtroNuevo, medir, type Filtro, type Point } from './geo';
import { fmtPaceStr, type Step } from './phases';
import { fmtTime } from './format';
import { initAudio, beep, doubleBeep, phaseBeep, speak } from './audio';
import { conectarPulso, type HrHandle } from './ble';

export type EstadoRec = 'idle' | 'running' | 'paused' | 'done' | 'saving' | 'saved';

export type Sesion = {
  estado: EstadoRec;
  workoutId: string | null;
  titulo: string;
  steps: Step[];
  pts: Point[];
  dist: number;        // metros
  elapsed: number;     // segundos
  idx: number;         // fase en curso
  stepDist: number;
  stepTime: number;
  recentPace: number;  // seg/km de los últimos 30 s
  gpsAcc: number | null;
  hr: number | null;
  sensor: string | null;
  sonido: boolean;
  msg: string;
  rpe: number | null;
  notas: string;
  subirStrava: boolean;
};

const VACIA: Sesion = {
  estado: 'idle', workoutId: null, titulo: 'Carrera', steps: [], pts: [],
  dist: 0, elapsed: 0, idx: 0, stepDist: 0, stepTime: 0, recentPace: 0,
  gpsAcc: null, hr: null, sensor: null, sonido: true, msg: '',
  rpe: null, notas: '', subirStrava: false,
};

let s: Sesion = { ...VACIA };
let vista: Sesion = s;                       // copia que lee React
const oyentes = new Set<() => void>();

// Lo que no se dibuja se queda aquí fuera.
let watchId: number | null = null;
let timerId: any = null;
let lock: any = null;
let filtro: Filtro = filtroNuevo();
let ultimoKm = 0;
let marcas: { t: number; d: number }[] = [];   // distancia acumulada en los últimos 30 s
let hrSum = { suma: 0, n: 0 };
let ble: HrHandle | null = null;
let arranque: number | null = null;          // Date.now() del último "en marcha"
let acumuladoMs = 0;                         // tiempo corrido antes de esta pausa
let guardadoT = 0;

function emitir() { vista = { ...s }; oyentes.forEach((f) => f()); }

export function suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f); }; }
export function leer() { return vista; }
export function leerEnServidor() { return VACIA; }

// ---------------------------------------------------------------- guardar copia

const CLAVE = 'coachrun.sesion';

function guardarLocal(forzar = false) {
  const ahora = Date.now();
  // En una tirada larga la traza pesa, así que se guarda más de tarde en tarde
  // para no dar tirones justo cuando más puntos hay.
  const cada = s.pts.length > 3000 ? 30000 : 5000;
  if (!forzar && ahora - guardadoT < cada) return;
  guardadoT = ahora;
  try { localStorage.setItem(CLAVE, JSON.stringify({ t: ahora, s, hrSum, ultimoKm })); } catch { /* sin sitio: seguimos */ }
}
function borrarLocal() { try { localStorage.removeItem(CLAVE); } catch {} }

// ---------------------------------------------------------------- voz y pitidos

function decirFase(i: number, prefijo = '') {
  const f = s.steps[i];
  if (!f || !s.sonido) return;
  const cuanto = f.mode === 'distance'
    ? (f.meters! >= 1000 ? `${(f.meters! / 1000).toFixed(1)} kilómetros` : `${f.meters} metros`)
    : `${Math.round((f.seconds ?? 0) / 60)} minutos`;
  const obj = f.paceLow || f.paceHigh ? `, ritmo ${fmtPaceStr(f.paceLow || f.paceHigh)}` : f.hrZone ? `, zona ${f.hrZone}` : '';
  phaseBeep();
  setTimeout(() => speak(`${prefijo}${f.name}. ${cuanto}${obj}`), 700);
}

function avanzar() {
  s.idx += 1; s.stepDist = 0; s.stepTime = 0;
  if (s.idx < s.steps.length) decirFase(s.idx);
  else if (s.sonido) { phaseBeep(); setTimeout(() => speak('Entrenamiento completado. Buen trabajo.'), 700); }
}

// ---------------------------------------------------------------- reloj y GPS

function segundos() {
  return Math.floor((acumuladoMs + (arranque ? Date.now() - arranque : 0)) / 1000);
}

function tick() {
  // El tiempo sale del reloj del sistema, no de contar interrupciones: si el
  // navegador ralentiza el temporizador en segundo plano, el cronómetro no se atrasa.
  const nuevo = segundos();
  const delta = nuevo - s.elapsed;
  if (delta <= 0) return;
  s.elapsed = nuevo;
  if (s.steps.length && s.idx < s.steps.length) {
    s.stepTime += delta;
    const f = s.steps[s.idx];
    if (f.mode === 'time' && s.stepTime >= (f.seconds ?? 0)) avanzar();
  }
  guardarLocal();
  emitir();
}

function onPos(pos: GeolocationPosition) {
  const c = pos.coords;
  s.gpsAcc = Math.round(c.accuracy);
  const p: Point = { lat: c.latitude, lng: c.longitude, t: pos.timestamp, alt: c.altitude ?? undefined, acc: c.accuracy };

  const { avance, punto } = medir(filtro, p);
  if (!punto) { emitir(); return; }              // punto descartado por el filtro
  s.pts = [...s.pts, punto];

  if (avance > 0) {
    s.dist += avance;

    // Ritmo de los últimos 30 s, a partir de la distancia ya filtrada.
    marcas.push({ t: p.t, d: s.dist });
    marcas = marcas.filter((m) => p.t - m.t < 30000);
    if (marcas.length > 1) {
      const dd = s.dist - marcas[0].d;
      const dt = (p.t - marcas[0].t) / 1000;
      s.recentPace = dd > 20 ? dt / (dd / 1000) : 0;
    }

    // Aviso de kilómetro, con o sin entrenamiento asignado
    const km = Math.floor(s.dist / 1000);
    if (km > ultimoKm) {
      ultimoKm = km;
      const ritmo = s.elapsed / (s.dist / 1000);
      if (s.sonido) {
        doubleBeep();
        const extra = s.hr ? `. Pulso ${s.hr}` : '';
        setTimeout(() => speak(`Kilómetro ${km}. Ritmo medio ${fmtPaceStr(ritmo).replace(':', ' ')}${extra}`), 500);
      }
    }

    if (s.steps.length && s.idx < s.steps.length) {
      s.stepDist += avance;
      const f = s.steps[s.idx];
      if (f.mode === 'distance' && s.stepDist >= (f.meters ?? 0)) avanzar();
    }
  }

  guardarLocal();
  emitir();
}

function pedirLock() {
  (navigator as any).wakeLock?.request('screen').then((l: any) => (lock = l)).catch(() => {});
}

function engancharGps() {
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onPos,
    (e) => { s.msg = e.code === 1 ? 'Permite el acceso a la ubicación en los ajustes del navegador.' : 'Buscando señal GPS…'; emitir(); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  timerId = setInterval(tick, 1000);
  pedirLock();
}

function soltarGps() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (timerId) { clearInterval(timerId); timerId = null; }
  lock?.release?.(); lock = null;
  // El filtro empieza de cero: entre la pausa y la vuelta puede haber movimiento
  // que no vimos, y no queremos contarlo como una línea recta.
  filtro = filtroNuevo(); marcas = [];
  s.recentPace = 0;
}

// ---------------------------------------------------------------- órdenes

/** Arranca una carrera nueva. Llamar siempre desde un clic: iOS exige un toque
 *  del usuario para dejar sonar el audio. */
export function iniciar(cfg: { workoutId: string | null; titulo: string; steps: Step[]; sonido: boolean; subirStrava: boolean }) {
  if (!('geolocation' in navigator)) { s.msg = 'Este navegador no tiene GPS.'; emitir(); return; }
  s = { ...VACIA, ...cfg, estado: 'running' };
  filtro = filtroNuevo(); marcas = []; ultimoKm = 0; hrSum = { suma: 0, n: 0 };
  acumuladoMs = 0; arranque = Date.now();
  initAudio();
  engancharGps();
  if (s.sonido) {
    if (s.steps.length) decirFase(0, 'Empezamos. ');
    else { phaseBeep(); setTimeout(() => speak('Empezamos. Buena carrera.'), 700); }
  }
  guardarLocal(true);
  emitir();
}

/** Continúa después de una pausa. */
export function continuar() {
  if (s.estado !== 'paused') return;
  s.estado = 'running'; s.msg = '';
  arranque = Date.now();
  initAudio();
  engancharGps();
  if (s.sonido) { beep(720, 0.15); setTimeout(() => speak('Seguimos.'), 400); }
  guardarLocal(true);
  emitir();
}

export function pausar() {
  if (s.estado !== 'running') return;
  acumuladoMs += Date.now() - (arranque ?? Date.now());
  arranque = null;
  s.dist += cerrar(filtro);
  soltarGps();
  s.estado = 'paused'; s.elapsed = segundos();
  if (s.sonido) { beep(440, 0.2); setTimeout(() => speak('En pausa.'), 350); }
  guardarLocal(true);
  emitir();
}

export function terminar() {
  if (s.estado !== 'running' && s.estado !== 'paused') return;
  if (arranque) { acumuladoMs += Date.now() - arranque; arranque = null; }
  s.dist += cerrar(filtro);
  soltarGps();
  ble?.stop(); ble = null;
  s.estado = 'done'; s.elapsed = segundos();
  if (s.sonido) {
    beep(880, 0.18);
    setTimeout(() => beep(600, 0.3), 220);
    const km = (s.dist / 1000).toFixed(2).replace('.', ' coma ');
    setTimeout(() => speak(`Actividad terminada. ${km} kilómetros en ${fmtTime(s.elapsed)}.`), 700);
  }
  guardarLocal(true);
  emitir();
}

export function descartar() {
  soltarGps();
  ble?.stop(); ble = null;
  s = { ...VACIA };
  acumuladoMs = 0; arranque = null; ultimoKm = 0; hrSum = { suma: 0, n: 0 };
  borrarLocal();
  emitir();
}

export function saltarFase() {
  if (s.idx < s.steps.length) { avanzar(); guardarLocal(true); emitir(); }
}

export function ponerSonido(v: boolean) { s.sonido = v; guardarLocal(true); emitir(); }
export function ponerRpe(v: number | null) { s.rpe = v; guardarLocal(true); emitir(); }
export function ponerNotas(v: string) { s.notas = v; guardarLocal(); emitir(); }
export function ponerStrava(v: boolean) { s.subirStrava = v; guardarLocal(true); emitir(); }
export function limpiarMensaje() { s.msg = ''; emitir(); }

export async function conectarSensor() {
  try {
    ble = await conectarPulso((bpm) => {
      s.hr = bpm; hrSum.suma += bpm; hrSum.n += 1;
      emitir();
    });
    s.sensor = ble.nombre; s.msg = '';
  } catch { s.msg = 'No se pudo conectar el sensor de pulso.'; }
  emitir();
}

/** Guarda la actividad. Deja el resultado en `msg` para que la pantalla lo muestre. */
export async function guardar(hasStrava: boolean) {
  if (s.estado !== 'done') return;
  s.estado = 'saving'; emitir();
  const media = hrSum.n ? Math.round(hrSum.suma / hrSum.n) : null;
  try {
    const r = await fetch('/api/strava/upload', { method: 'POST', body: JSON.stringify({
      points: s.pts, name: s.titulo, workoutId: s.workoutId ?? undefined, movingTime: s.elapsed,
      distanceM: Math.round(s.dist),
      subirStrava: hasStrava && s.subirStrava, rpe: s.rpe, notas: s.notas || null, avgHr: media,
    }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { s.estado = 'done'; s.msg = j.error ?? 'No se pudo guardar.'; emitir(); return; }
    s.msg = hasStrava && s.subirStrava ? `Guardado. Strava: ${j.uploadStatus}` : 'Guardado en MyCoachRuns.';
    s.estado = 'saved';
    borrarLocal();
  } catch {
    s.estado = 'done'; s.msg = 'No se pudo guardar. Revisa la conexión e inténtalo otra vez.';
  }
  emitir();
}

// ---------------------------------------------------------------- al cargar

if (typeof window !== 'undefined') {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo);
      const horas = (Date.now() - (g?.t ?? 0)) / 3600000;
      const recuperable = g?.s && horas < 12 && ['running', 'paused', 'done'].includes(g.s.estado);
      if (recuperable) {
        // Una carrera "en marcha" que sobrevive a un cierre de la app vuelve en
        // pausa: el GPS estuvo parado y no sabemos por dónde fue mientras tanto.
        s = { ...VACIA, ...g.s, estado: g.s.estado === 'running' ? 'paused' : g.s.estado };
        if (g.s.estado === 'running') s.msg = 'La app se cerró y la grabación quedó en pausa. Pulsa Continuar para seguir, o Terminar para guardar lo que llevas.';
        hrSum = { suma: g.hrSum?.suma ?? 0, n: g.hrSum?.n ?? 0 };
        ultimoKm = g.ultimoKm ?? Math.floor(s.dist / 1000);
        acumuladoMs = s.elapsed * 1000;
        vista = s;
      } else borrarLocal();
    }
  } catch { borrarLocal(); }

  // El bloqueo de pantalla se pierde al pasar la app a segundo plano: lo repedimos.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && s.estado === 'running') pedirLock();
  });
}
