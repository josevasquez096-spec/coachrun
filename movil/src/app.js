/**
 * Guion de la pantalla de prueba.
 *
 * Va aparte del HTML y se empaqueta con esbuild (`npm run build`) porque
 * `registerPlugin` NO viene con Android: la trae la librería @capacitor/core y
 * hay que meterla dentro del archivo. Escribiendo el guion suelto en el HTML,
 * la app arrancaba pero no llegaba al GPS nativo:
 *     window.Capacitor.registerPlugin is not a function
 */
import { registerPlugin, Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// ------------------------------------------------------------------ el filtro
// Copia exacta de medir() en lib/geo.ts. Si allí se cambian el peso o el umbral,
// hay que cambiarlos aquí también, o la prueba deja de medir lo mismo que la app.
var ACC_MAX = 30, V_MAX = 12;
function hav(a, b) {
  var R = 6371000, r = function (d) { return d * Math.PI / 180; };
  var dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.pow(Math.sin(dLng / 2), 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
var f = { suave: null, ancla: null, ultimo: null };
function medir(p) {
  var acc = p.acc || 0;
  if (acc > ACC_MAX) return { avance: 0, usado: false };
  if (f.ultimo) {
    var dt = Math.max(0.5, (p.t - f.ultimo.t) / 1000);
    if (hav(f.ultimo, p) / dt > V_MAX) return { avance: 0, usado: false };
  }
  f.ultimo = p;
  var peso = 1 / (1 + Math.max(acc, 3) / 5);
  f.suave = !f.suave ? { lat: p.lat, lng: p.lng, t: p.t, acc: acc }
    : { lat: f.suave.lat + (p.lat - f.suave.lat) * peso, lng: f.suave.lng + (p.lng - f.suave.lng) * peso, t: p.t, acc: acc };
  if (!f.ancla) { f.ancla = { lat: f.suave.lat, lng: f.suave.lng, t: p.t }; return { avance: 0, usado: true, pend: 0, umbral: 0 }; }
  var d = hav(f.ancla, f.suave);
  var umbral = Math.min(15, Math.max(8, acc * 1.5));
  if (d < umbral) return { avance: 0, usado: true, pend: d, umbral: umbral };
  f.ancla = { lat: f.suave.lat, lng: f.suave.lng, t: p.t };
  return { avance: d, usado: true, pend: 0, umbral: umbral };
}

// ------------------------------------------------------------------ estado
var BG = null, AVISOS = null, watcher = null, arranque = null, reloj = null;
var dist = 0, crudo = 0, previo = null, recibidos = 0, usados = 0, ultimoT = 0;
var inicioPunto = null, pendiente = 0, umbralAhora = 8, avisado = false;
var OBJETIVO = 100;   // metros en línea recta que hacen la prueba concluyente
var lineas = [];

function log(t) {
  var h = new Date().toLocaleTimeString('es');
  lineas.unshift(h + '  ' + t);
  if (lineas.length > 200) lineas.pop();
  document.getElementById('log').textContent = lineas.join('\n');
}
function txt(id, v) { document.getElementById(id).textContent = v; }
function marca(id, bien, si, no) {
  var e = document.getElementById(id);
  e.textContent = bien ? (si || 'Sí') : (no || 'No');
  e.className = bien ? 'ok' : 'mal';
}
function mmss(s) {
  var m = Math.floor(s / 60), x = Math.floor(s % 60);
  return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
}

function pintar() {
  txt('m-km', (dist / 1000).toFixed(2));
  txt('m-crudo', (crudo / 1000).toFixed(2) + ' km');
  txt('m-puntos', recibidos + ' / ' + usados);
  txt('m-tiempo', arranque ? mmss((Date.now() - arranque) / 1000) : '0:00');
  txt('m-hace', ultimoT ? Math.round((Date.now() - ultimoT) / 1000) + ' s' : '—');
  var recta = inicioPunto && f.suave ? hav(inicioPunto, f.suave) : 0;
  txt('m-recta', Math.round(recta) + ' / ' + OBJETIVO + ' m');
  var barra = document.getElementById('m-barra');
  barra.style.width = Math.min(100, (recta / OBJETIVO) * 100) + '%';
  if (recta >= OBJETIVO) {
    barra.parentNode.className = 'barra hecho';
    if (!avisado) {
      avisado = true;
      // Se compara aquí mismo: el número de la izquierda no pasa por el filtro.
      log('¡OBJETIVO! ' + Math.round(recta) + ' m en línea recta · el filtro lleva ' +
          (dist / 1000).toFixed(3) + ' km. Ya puedes PARAR. (Si has ido derecho, deberían parecerse; ' +
          'si has dado vueltas, el filtro marcará más, que es lo correcto.)');
    }
  }
  txt('m-pend', pendiente.toFixed(1) + ' / ' + Math.round(umbralAhora) + ' m');
}

// ------------------------------------------------------------------ arranque
var nativo = Capacitor.isNativePlatform();
marca('d-nativo', nativo, 'Sí (' + Capacitor.getPlatform() + ')', 'No, es el navegador');
if (nativo) {
  try {
    BG = registerPlugin('BackgroundGeolocation');
    AVISOS = registerPlugin('LocalNotifications');
    marca('d-plugin', true);
  } catch (e) { marca('d-plugin', false); log('No se pudo cargar el complemento: ' + e.message); }
} else {
  marca('d-plugin', false, '', 'Solo dentro de la app');
  document.getElementById('d-permiso').textContent = '—';
  document.getElementById('d-aviso').textContent = '—';
}
log('Listo. ' + (nativo ? 'Dentro de la app de Android.' : 'Abierto en un navegador normal.'));

// El permiso se mira al abrir, sin esperar a que se pulse nada: si ya estaba
// denegado de antes, el complemento de segundo plano se queda callado (ni un
// punto ni un error) y parece que no hace nada.
async function mirarPermiso(pedir) {
  if (!nativo) return null;
  try {
    var e = await Geolocation.checkPermissions();
    if (pedir && e.location !== 'granted') e = await Geolocation.requestPermissions();
    var ok = e.location === 'granted';
    marca('d-permiso', ok, 'Concedido', e.location === 'denied' ? 'DENEGADO' : e.location);
    return e.location;
  } catch (err) {
    marca('d-permiso', false, '', 'no se pudo leer');
    log('No se pudo leer el permiso: ' + (err.message || err));
    return null;
  }
}
mirarPermiso(false);

// --- prueba de un solo punto: separa "el GPS no va" de "el segundo plano no va"
document.getElementById('b-punto').onclick = async function () {
  if (!nativo) { log('Esto solo funciona dentro de la app.'); return; }
  this.disabled = true;
  var estado = await mirarPermiso(true);
  if (estado !== 'granted') {
    log('Sin permiso de ubicación (' + estado + '). Toca "Abrir los ajustes de la app" y concédelo.');
    this.disabled = false; return;
  }
  log('Pidiendo una posición… (puede tardar hasta 30 s la primera vez)');
  try {
    var pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
    marca('d-fix', true, 'Sí, ±' + Math.round(pos.coords.accuracy) + ' m');
    txt('m-acc', Math.round(pos.coords.accuracy));
    log('POSICIÓN OK · ±' + Math.round(pos.coords.accuracy) + ' m');
  } catch (e) {
    marca('d-fix', false, '', 'falló');
    // El mensaje del sistema es lo que nos dice si está apagada la ubicación,
    // si no hay señal, o si el permiso está a medias.
    log('FALLÓ la posición: ' + (e && (e.message || e.errorMessage) ? (e.message || e.errorMessage) : JSON.stringify(e)));
  }
  this.disabled = false;
};

document.getElementById('b-ajustes').onclick = function () {
  if (BG && BG.openSettings) BG.openSettings();
  else log('Abre a mano: Ajustes de Android → Aplicaciones → MyCoachRuns → Permisos.');
};

document.getElementById('b-empezar').onclick = async function () {
  if (!BG) { log('Sin complemento nativo: esta prueba solo funciona dentro de la app.'); return; }
  dist = 0; crudo = 0; previo = null; recibidos = 0; usados = 0;
  inicioPunto = null; pendiente = 0; umbralAhora = 8; avisado = false;
  document.getElementById('m-barra').parentNode.className = 'barra';
  f = { suave: null, ancla: null, ultimo: null };
  arranque = Date.now();
  this.disabled = true; document.getElementById('b-parar').disabled = false;
  reloj = setInterval(pintar, 1000);
  // Desde Android 13 la notificación necesita su propio permiso, y sin
  // notificación el sistema no deja mantener el servicio en segundo plano.
  if (AVISOS) {
    try {
      var pa = await AVISOS.checkPermissions();
      if (pa.display !== 'granted') pa = await AVISOS.requestPermissions();
      marca('d-aviso', pa.display === 'granted', 'Concedido', pa.display);
    } catch (e) { marca('d-aviso', false, '', 'no disponible'); }
  }
  var estado = await mirarPermiso(true);
  if (estado !== 'granted') {
    log('Sin permiso de ubicación (' + estado + '): el GPS en segundo plano no va a dar señales de vida. ' +
        'Toca "Abrir los ajustes de la app" y concédelo.');
    this.disabled = false; document.getElementById('b-parar').disabled = true;
    clearInterval(reloj); reloj = null; arranque = null;
    return;
  }
  // Si en medio minuto no ha llegado ni un punto, algo va mal: mejor decirlo
  // que dejar al usuario mirando ceros durante media hora.
  var vigia = setTimeout(function () {
    if (recibidos === 0) log('AVISO: medio minuto sin recibir ni un punto. Si estás dentro de un edificio, ' +
      'sal a la calle. Si ya estás fuera, esto es el fallo que hay que reportar.');
  }, 30000);
  log('Arrancando el GPS en segundo plano…');
  try {
    watcher = await BG.addWatcher({
      backgroundTitle: 'MyCoachRuns está midiendo',
      backgroundMessage: 'Toca para volver a la app.',
      requestPermissions: true,
      stale: false,
      distanceFilter: 0,
    }, function (pos, err) {
      if (err) {
        marca('d-permiso', false, '', err.code === 'NOT_AUTHORIZED' ? 'DENEGADO' : err.code);
        log('ERROR del GPS: ' + err.code + ' ' + (err.message || ''));
        return;
      }
      marca('d-permiso', true, 'Concedido');
      recibidos++;
      ultimoT = Date.now();
      var p = { lat: pos.latitude, lng: pos.longitude, t: pos.time || Date.now(), acc: pos.accuracy };
      if (previo) crudo += hav(previo, p);
      previo = p;
      var r = medir(p);
      if (r.usado) usados++;
      if (r.avance > 0) dist += r.avance;
      pendiente = r.pend || 0;
      if (r.umbral) umbralAhora = r.umbral;
      // La línea recta desde el primer punto no depende del filtro: si caminas
      // 100 m derecho, esto tiene que marcar ~100 m. Es la vara de medir.
      if (!inicioPunto) inicioPunto = { lat: p.lat, lng: p.lng };
      txt('m-acc', Math.round(pos.accuracy));
      if (recibidos % 10 === 1) log('punto ' + recibidos + ' · ±' + Math.round(pos.accuracy) + ' m · ' + (dist / 1000).toFixed(2) + ' km');
      pintar();
    });
    log('Midiendo (vigilante ' + watcher + '). Ya puedes bloquear el teléfono.');
  } catch (e) {
    clearTimeout(vigia);
    log('No se pudo arrancar: ' + (e && (e.message || e.errorMessage) ? (e.message || e.errorMessage) : JSON.stringify(e)));
    this.disabled = false;
  }
};

document.getElementById('b-parar').onclick = async function () {
  if (watcher && BG) { try { await BG.removeWatcher({ id: watcher }); } catch (e) {} }
  watcher = null; clearInterval(reloj); reloj = null;
  this.disabled = true; document.getElementById('b-empezar').disabled = false;
  log('PARADO. Filtrado ' + (dist / 1000).toFixed(3) + ' km · sin filtrar ' + (crudo / 1000).toFixed(3) + ' km · ' +
      'en línea recta ' + (inicioPunto && f.suave ? Math.round(hav(inicioPunto, f.suave)) : 0) + ' m · ' +
      recibidos + ' puntos en ' + mmss((Date.now() - arranque) / 1000));
  pintar();
};

document.getElementById('b-copiar').onclick = function () {
  var t = 'MyCoachRuns prueba de GPS\n' +
    'nativo: ' + nativo + ' · complemento: ' + !!BG + '\n' +
    'filtrado: ' + (dist / 1000).toFixed(3) + ' km · sin filtrar: ' + (crudo / 1000).toFixed(3) + ' km\n' +
    'en línea recta desde el inicio: ' + (inicioPunto && f.suave ? Math.round(hav(inicioPunto, f.suave)) : 0) + ' m\n' +
    'puntos: ' + recibidos + ' recibidos, ' + usados + ' usados\n' +
    'tiempo: ' + (arranque ? mmss((Date.now() - arranque) / 1000) : '—') + '\n\n' + lineas.join('\n');
  if (navigator.share) navigator.share({ text: t }).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { log('Informe copiado.'); });
};

document.getElementById('b-web').onclick = function () {
  // La marca en la dirección deja que la web sepa que viene de dentro de la app,
  // y así puede decir "sin puente" en vez de no decir nada.
  location.href = 'https://coachrun-delta.vercel.app/?desde=app';
};
