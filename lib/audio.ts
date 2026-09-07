/** Pitidos y voz sin archivos: todo lo genera el navegador. */
let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  // iOS exige un sonido tras un toque del usuario para desbloquear el audio
  beep(880, 0.06, 0.15);
}

export function beep(freq = 880, dur = 0.15, gain = 0.4) {
  if (!ctx) return;
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.frequency.value = freq; osc.type = 'sine';
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + dur);
}

export function doubleBeep() { beep(660, 0.12); setTimeout(() => beep(990, 0.18), 160); }
export function phaseBeep() { beep(520, 0.12); setTimeout(() => beep(720, 0.12), 150); setTimeout(() => beep(980, 0.25), 300); }

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES'; u.rate = 1.05;
  speechSynthesis.speak(u);
}
