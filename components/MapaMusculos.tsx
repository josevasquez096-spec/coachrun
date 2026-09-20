'use client';
import { MUSCULOS, ANCHO, EJE, MANCHAS, lados, type Cara } from '@/lib/musculos';
import { nombreMusculo, useIdioma } from '@/lib/idioma';

/**
 * El selector de músculos: los dos cuerpos más la lista de nombres.
 *
 * El cuerpo es **el dibujo del propio proyecto** (`public/musculos/`), con su
 * fondo oscuro tal cual. Dibujarlo a mano con formas se intentó y quedaba como
 * un robot con pegatinas; y recortarle el fondo para dejarlo transparente
 * dejaba jirones grises entre las piernas, porque la sombra de ahí es tan
 * oscura como el fondo y no hay umbral que las separe bien. Con el fondo
 * puesto no hay recorte que pueda salir mal.
 *
 * Dos cosas que hacen que se pueda usar de verdad:
 *  - Las zonas que se pueden tocar se ven siempre, en punteado. Sin eso hay
 *    que adivinar dónde tocar.
 *  - Debajo va la **lista de nombres**, y marca igual que tocar el cuerpo.
 *    Acertar un músculo pequeño con el dedo en un móvil es incómodo; la lista
 *    es la manera cómoda, el cuerpo es la manera visual.
 *
 * El rojo rompe la norma de la paleta (donde era solo para mensajes sin leer).
 * Asumido: es lo que pidió el dueño y lo que hacen las apps del ramo.
 */
export const ROJO_MUSCULO = '#E5332A';


export default function MapaMusculos({
  marcados, alTocar, alto = 290, id = 'mm', conLista = true,
}: {
  marcados: string[]; alTocar?: (id: string) => void;
  alto?: number; id?: string; conLista?: boolean;
}) {
  const { t } = useIdioma();
  const vivo = !!alTocar;

  const cara = (c: Cara) => {
    const w = ANCHO[c], eje = EJE[c];
    const grupos = MUSCULOS.filter((m) => m.cara === c);

    return (
      <svg key={c} viewBox={`0 0 ${w} 400`} height={alto} width={(alto * w) / 400}
        role="img" aria-label={`Cuerpo de ${c}`} style={{ touchAction: 'manipulation', display: 'block' }}>
        <defs>
          <filter id={`${id}-${c}-halo`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <image href={`/musculos/${c}.png`} x={0} y={0} width={w} height={400} />

        {grupos.map((m) => {
          const on = marcados.includes(m.id);
          return (MANCHAS[m.id] ?? []).flatMap((f, i) =>
            lados(f, eje).map((cx, j) => (
              <g key={`${m.id}-${i}-${j}`}>
                {on && <ellipse cx={cx} cy={f.cy} rx={f.rx} ry={f.ry}
                  fill={ROJO_MUSCULO} opacity={0.45} filter={`url(#${id}-${c}-halo)`} />}
                <ellipse cx={cx} cy={f.cy} rx={f.rx} ry={f.ry}
                  fill={on ? ROJO_MUSCULO : 'transparent'} fillOpacity={on ? 0.5 : 1}
                  stroke={on ? ROJO_MUSCULO : '#8E978E'}
                  strokeWidth={on ? 1.4 : 1}
                  strokeDasharray={on ? undefined : '3 3'}
                  strokeOpacity={on ? 0.95 : (vivo ? 0.5 : 0)}
                  style={vivo ? { cursor: 'pointer' } : undefined}
                  onClick={alTocar ? () => alTocar(m.id) : undefined}>
                  <title>{nombreMusculo(m.id)}</title>
                </ellipse>
              </g>
            )));
        })}
      </svg>
    );
  };

  return (
    <div>
      {/* Caja oscura: el dibujo trae su propio fondo negro y así se funde con
          ella en vez de recortarse contra una tarjeta blanca. */}
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'flex-start',
        background: '#0B0D0B', borderRadius: 16, padding: '8px 4px', overflow: 'hidden',
      }}>
        {/* Espalda a la izquierda y frente a la derecha, como en el dibujo original. */}
        {cara('espalda')}{cara('frente')}
      </div>
      <p className="muted" style={{ fontSize: 11.5, textAlign: 'center', margin: '6px 0 0' }}>
        izquierda: espalda · derecha: frente
      </p>

      {conLista && vivo && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {MUSCULOS.map((m) => {
              const on = marcados.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => alTocar!(m.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${on ? ROJO_MUSCULO : 'var(--line)'}`,
                    background: on ? ROJO_MUSCULO : 'transparent',
                    color: on ? '#fff' : 'var(--ink-2)',
                  }}>{nombreMusculo(m.id)}</button>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            {marcados.length
              ? <>{t('musc.marcados')} <b>{MUSCULOS.filter((m) => marcados.includes(m.id)).map((m) => nombreMusculo(m.id)).join(', ')}</b></>
              : t('musc.toca')}
          </p>
        </>
      )}
    </div>
  );
}
