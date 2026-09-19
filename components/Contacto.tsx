'use client';
import { useState } from 'react';
import { CORREO } from '@/lib/marca';

/**
 * Formulario para escribir al entrenador.
 *
 * No manda el correo por su cuenta: **abre la app de correo del teléfono** con
 * el destinatario, el asunto y el mensaje ya puestos, y la persona solo da a
 * enviar. Se hizo así a propósito: mandarlo solo obligaría a contratar un
 * servicio de envío, guardar una clave y mantenerlo. Esto funciona en
 * cualquier teléfono desde el primer día, y además la respuesta va directa al
 * correo de quien escribe.
 *
 * Dentro del APK también vale: Capacitor entrega las direcciones `mailto:` a
 * Android, que abre la app de correo.
 */
export default function Contacto({ deParte }: { deParte?: string | null }) {
  const [nombre, setNombre] = useState(deParte ?? '');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [copiado, setCopiado] = useState(false);

  const cuerpo = `${mensaje}\n\n—\n${nombre || 'Un atleta'}\nEnviado desde MyCoachRuns`;
  const enlace = `mailto:${CORREO}`
    + `?subject=${encodeURIComponent(asunto || 'Consulta desde MyCoachRuns')}`
    + `&body=${encodeURIComponent(cuerpo)}`;

  // Por si el teléfono no tiene ninguna app de correo configurada: que el
  // mensaje no se pierda por eso.
  async function copiar() {
    try {
      await navigator.clipboard.writeText(`Para: ${CORREO}\nAsunto: ${asunto}\n\n${cuerpo}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* sin portapapeles no pasa nada: el texto sigue en pantalla */ }
  }

  return (
    <>
      <h2>Escríbenos</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
        ¿Una duda, un fallo, una idea? Al enviar se abre tu app de correo con el mensaje listo.
      </p>

      <div className="field"><label>Tu nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cómo te llamas" /></div>

      <div className="field"><label>Asunto</label>
        <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="De qué se trata" /></div>

      <div className="field"><label>Mensaje</label>
        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={5}
          placeholder="Cuéntame…" style={{ resize: 'vertical' }} /></div>

      <a className={'btn flare block' + (mensaje.trim() ? '' : ' desactivado')}
        href={mensaje.trim() ? enlace : undefined}
        aria-disabled={!mensaje.trim()}
        style={mensaje.trim() ? undefined : { pointerEvents: 'none', opacity: .5 }}>
        Enviar por correo
      </a>

      <button className="btn ghost block" onClick={copiar} disabled={!mensaje.trim()} style={{ marginTop: 8 }}>
        {copiado ? '✓ Copiado' : 'Copiar el mensaje'}
      </button>

      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        También puedes escribir directo a <b>{CORREO}</b>
      </p>
    </>
  );
}
