import Avatar from './Avatar';
import { LOGO } from '@/lib/marca';

/**
 * La cabecera de cada pantalla: el logo a la izquierda, quién eres a la
 * derecha, y debajo el título con una frase que dice de qué va la pantalla.
 *
 * El logo va como imagen y no como texto porque el de verdad lleva el corredor
 * y el lema. Necesita fondo claro: su letra es oscura.
 */
export default function Cabecera({
  titulo, frase, nombre, avatar, dato,
}: { titulo: string; frase?: string; nombre?: string | null; avatar?: string | null; dato?: string | null }) {
  return (
    <>
      <div className="topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} alt="MyCoachRuns" className="brand-logo" width={900} height={430} />
        {/* `dato` es una cifra (los km del total), no una persona: va sin
            avatar, porque si no se le sacaba la inicial y salía un "1". */}
        {dato && <span style={{ fontWeight: 800, fontSize: 15 }}>{dato}</span>}
        {!dato && nombre && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</span>
            <Avatar url={avatar} name={nombre} size={36} />
          </div>
        )}
      </div>
      <h1>{titulo}</h1>
      {frase && <p className="sub">{frase}</p>}
    </>
  );
}
