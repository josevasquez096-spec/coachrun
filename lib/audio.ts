/**
 * Pitidos y voz sin archivos: todo lo genera el navegador.
 *
 * Dos problemas que se arreglan aquí, y que hacían que la app se quedara muda
 * a mitad de carrera:
 *  - El navegador **suspende el audio** al pasar la app a segundo plano (bloquear
 *    la pantalla). Al volver no se reanuda solo: hay que pedírselo.
 *  - La voz del navegador se queda **colgada** tras un rato: acepta frases pero
 *    no las dice. Cancelar la cola antes de cada frase la desatasca.
 */
let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  despertarAudio();
  // iOS exige un sonido tras un toque del usuario para desbloquear el audio
  beep(880, 0.06, 0.15);
}

/** Reanuda el audio y la voz. Llamar al volver a la app y antes de cada aviso. */
export function despertarAudio() {
  try { if (ctx && ctx.state !== 'running') ctx.resume(); } catch {}
  try { if (typeof speechSynthesis !== 'undefined' && speechSynthesis.paused) speechSynthesis.resume(); } catch {}
}

export function beep(freq = 880, dur = 0.15, gain = 0.4) {
  if (!ctx) return;
  despertarAudio();
  try {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.frequency.value = freq; osc.type = 'sine';
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch { /* el navegador aún no deja sonar: no es motivo para romper nada */ }
}

export function doubleBeep() { beep(660, 0.12); setTimeout(() => beep(990, 0.18), 160); }
export function phaseBeep() { beep(520, 0.12); setTimeout(() => beep(720, 0.12), 150); setTimeout(() => beep(980, 0.25), 300); }

// La voz va en cola: si se lanzan dos frases seguidas, la segunda cortaba a la primera.
let cola: string[] = [];
let hablando = false;

export function speak(text: string) {
  if (typeof speechSynthesis === 'undefined') return;
  cola.push(text);
  if (!hablando) siguiente();
}

function siguiente() {
  const frase = cola.shift();
  if (!frase) { hablando = false; return; }
  hablando = true;
  try {
    speechSynthesis.cancel();          // desatasca la cola del navegador
    speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(frase);
    u.lang = 'es-ES'; u.rate = 0.9; u.pitch = 1; u.volume = 1;
    let cerrado = false;
    const cerrar = () => { if (cerrado) return; cerrado = true; clearTimeout(reloj); setTimeout(siguiente, 120); };
    u.onend = cerrar; u.onerror = cerrar;
    // Si el navegador no avisa de que terminó (pasa), seguimos igual.
    const reloj = setTimeout(cerrar, Math.max(4000, frase.length * 140));
    speechSynthesis.speak(u);
  } catch { hablando = false; cola = []; }
}

/** Corta lo que se esté diciendo y vacía la cola (al pausar o terminar). */
export function callar() {
  cola = [];
  hablando = false;
  try { speechSynthesis.cancel(); } catch {}
}
