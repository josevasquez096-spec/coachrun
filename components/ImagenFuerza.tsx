'use client';
import { useState } from 'react';
import { ANCHO, EJE, MANCHAS, CARA_DE, lados } from '@/lib/musculos';
import { fmtTime } from '@/lib/format';
import MapaMusculos from './MapaMusculos';
import { locale, nombresMusculos, useIdioma } from '@/lib/idioma';

/**
 * La imagen de una sesión de fuerza, para guardar o compartir.
 *
 * El dibujo que se ve en pantalla es SVG, y un SVG no se puede guardar como
 * foto tal cual: hay que pasarlo por un lienzo. Y el lienzo **no acepta un SVG
 * que enlace imágenes de fuera** (se queda en blanco por seguridad), así que
 * el cuerpo se carga aparte y se pinta a mano encima del lienzo.
 *
 * Para guardar se usa `navigator.share` cuando existe: en iPhone la descarga
 * directa de un blob no funciona, y esa es la única vía que abre el menú de
 * guardar. Ya nos mordió antes con las imágenes de las carreras.
 */
type A = { name: string | null; started_at: string; moving_time_s: number | null; muscles?: string[] | null };


const cargar = (src: string) => new Promise<HTMLImageElement>((ok, mal) => {
  const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src;
});

export default function ImagenFuerza({ a }: { a: A }) {
  const { t } = useIdioma();
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');
  const marcados = a.muscles ?? [];

  async function generar(): Promise<File | null> {
    const L = 1080, lienzo = document.createElement('canvas');
    lienzo.width = L; lienzo.height = L;
    const g = lienzo.getContext('2d'); if (!g) return null;

    g.fillStyle = '#0B0D0B'; g.fillRect(0, 0, L, L);

    const [esp, fre] = await Promise.all([cargar('/musculos/espalda.png'), cargar('/musculos/frente.png')]);
    const altoFig = 600, y0 = 210;
    let x = L / 2 - (ANCHO.espalda + ANCHO.frente) * (altoFig / 400) / 2 - 20;

    for (const [cara, img] of [['espalda', esp], ['frente', fre]] as const) {
      const k = altoFig / 400, w = ANCHO[cara] * k;
      g.drawImage(img, x, y0, w, altoFig);
      g.save();
      g.globalAlpha = 0.55; g.fillStyle = '#E5332A';
      for (const id of marcados) {
        if (CARA_DE[id] !== cara) continue;
        for (const f of MANCHAS[id] ?? []) {
          const xs = lados(f, EJE[cara]);
          for (const cx of xs) {
            g.beginPath();
            g.ellipse(x + cx * k, y0 + f.cy * k, f.rx * k, f.ry * k, 0, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.restore();
      x += w + 40;
    }

    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '800 54px system-ui, sans-serif';
    g.fillText(a.name || t('img.fuerza'), L / 2, 110);
    g.font = '500 30px system-ui, sans-serif'; g.fillStyle = '#B9C0B9';
    const fecha = new Date(a.started_at).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    g.fillText(a.moving_time_s ? `${fecha} · ${fmtTime(a.moving_time_s)}` : fecha, L / 2, 158);

    const nombres = nombresMusculos(marcados);
    g.font = '700 27px system-ui, sans-serif'; g.fillStyle = '#94F420';
    const linea1 = nombres.slice(0, 4).join(' · '), linea2 = nombres.slice(4).join(' · ');
    if (linea1) g.fillText(linea1, L / 2, y0 + altoFig + 62);
    if (linea2) g.fillText(linea2, L / 2, y0 + altoFig + 100);

    g.font = '800 26px system-ui, sans-serif'; g.fillStyle = '#fff';
    g.fillText('MyCoachRuns', L / 2, L - 40);

    const blob: Blob | null = await new Promise((r) => lienzo.toBlob(r, 'image/png'));
    return blob ? new File([blob], 'fuerza.png', { type: 'image/png' }) : null;
  }

  async function guardar() {
    setOcupado(true); setMsg('');
    try {
      const f = await generar();
      if (!f) { setMsg(t('img.noCreada')); return; }
      const nav: any = navigator;
      // En iPhone `<a download>` con un blob no funciona: el menú de compartir
      // es la única vía. Se intenta primero siempre.
      if (nav.canShare?.({ files: [f] })) {
        try { await nav.share({ files: [f] }); return; } catch { /* si cancela, se descarga */ }
      }
      const url = URL.createObjectURL(f);
      const el = document.createElement('a');
      el.href = url; el.download = f.name;
      document.body.appendChild(el); el.click(); el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      setMsg(e?.message ?? t('img.noGuardada'));
    } finally { setOcupado(false); }
  }

  if (!marcados.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <MapaMusculos marcados={marcados} alto={230} id="act" />
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 8px' }}>{nombresMusculos(marcados).join(' · ')}</p>
      <button className="btn ghost block" onClick={guardar} disabled={ocupado}>
        {ocupado ? t('img.creando') : t('img.guardar')}
      </button>
      {msg && <p className="notice" style={{ fontSize: 13 }}>{msg}</p>}
    </div>
  );
}
