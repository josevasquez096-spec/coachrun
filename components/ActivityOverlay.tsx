'use client';
import { useRef, useState } from 'react';
import { fmtPace, fmtTime } from '@/lib/format';
import { decodePolyline } from '@/lib/polyline';

// El canvas no entiende las variables de CSS: mismo verde de la paleta.
const VERDE = '#12A85B';

type A = { name: string | null; started_at: string; distance_m: number | null; moving_time_s: number | null; avg_hr: number | null; polyline: string | null };

/** Genera una imagen cuadrada con la foto del usuario y los datos encima. */
export default function ActivityOverlay({ a }: { a: A }) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardar() {
    if (!archivo || !url) return;
    // En iPhone la descarga directa no funciona: usamos el menú de compartir.
    const nav: any = navigator;
    if (nav.canShare?.({ files: [archivo] })) {
      try { await nav.share({ files: [archivo] }); return; } catch { /* si cancela, seguimos */ }
    }
    const a = document.createElement('a');
    a.href = url; a.download = archivo.name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function generar(file: File) {
    setBusy(true);
    const S = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d')!;

    const img = await createImageBitmap(file);
    // Recorte "cover"
    const escala = Math.max(S / img.width, S / img.height);
    const w = img.width * escala, h = img.height * escala;
    ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);

    // Degradado inferior para que el texto se lea
    const grad = ctx.createLinearGradient(0, S * 0.42, 0, S);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, S, S);

    // Trazado de la ruta arriba a la derecha
    if (a.polyline) {
      try {
        const pts = decodePolyline(a.polyline);
        if (pts.length > 3) {
          const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
          const box = 300, pad = 56;
          const span = Math.max(maxLat - minLat, maxLng - minLng) || 1;
          ctx.save();
          ctx.strokeStyle = VERDE; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10;
          ctx.beginPath();
          pts.forEach(([la, ln], i) => {
            const x = S - pad - box + ((ln - minLng) / span) * box;
            const y = pad + box - ((la - minLat) / span) * box;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          });
          ctx.stroke(); ctx.restore();
        }
      } catch {}
    }

    const km = (a.distance_m ?? 0) / 1000;
    const pace = (a.moving_time_s ?? 0) / (km || 1);

    // Cifra principal
    ctx.fillStyle = '#fff';
    ctx.font = '800 152px Archivo, system-ui, sans-serif';
    ctx.fillText(km.toFixed(2), 62, S - 250);
    ctx.font = '700 46px Archivo, system-ui, sans-serif';
    ctx.fillStyle = VERDE;
    ctx.fillText('KM', 66 + ctx.measureText('').width + 0, S - 190);

    // Fila de datos
    const datos: [string, string][] = [
      ['TIEMPO', fmtTime(a.moving_time_s ?? 0)],
      ['RITMO', `${fmtPace(pace)} /km`],
    ];
    if (a.avg_hr) datos.push(['PULSO', `${Math.round(a.avg_hr)} ppm`]);
    datos.forEach(([et, v], i) => {
      const x = 62 + i * 330;
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.font = '700 30px Archivo, system-ui, sans-serif';
      ctx.fillText(et, x, S - 132);
      ctx.fillStyle = '#fff';
      ctx.font = '800 58px Archivo, system-ui, sans-serif';
      ctx.fillText(v, x, S - 76);
    });

    // Marca
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '700 30px Archivo, system-ui, sans-serif';
    const marca = 'MyCoachRuns · By JVasquez';
    ctx.fillText(marca, S - 62 - ctx.measureText(marca).width, S - 40);

    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92));
    setArchivo(new File([blob], `${(a.name ?? 'carrera').replace(/[^a-z0-9]+/gi, '-')}.jpg`, { type: 'image/jpeg' }));
    setUrl(URL.createObjectURL(blob));
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <input ref={input} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) generar(f); }} />
      {!url ? (
        <button className="btn ghost block" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Creando imagen…' : 'Crear foto con mis datos'}
        </button>
      ) : (
        <>
          <img src={url} alt="" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn flare" style={{ flex: 1 }} onClick={guardar}>Guardar o compartir</button>
            <button className="btn ghost" onClick={() => input.current?.click()}>Otra foto</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>También puedes mantener pulsada la imagen para guardarla.</p>
        </>
      )}
    </div>
  );
}
