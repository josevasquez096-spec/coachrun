'use client';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Cabecera from '@/components/Cabecera';
import { usePantalla, papel } from '@/lib/pantalla';
import { CORREO, WHATSAPP_VISIBLE, waLink } from '@/lib/marca';

/**
 * Lo que ofrece el entrenador más allá de la app.
 *
 * No consulta nada a la base de datos: es una página de contenido, así que se
 * dibuja entera aunque no haya conexión. Se deja dentro de la app y no como
 * web aparte para que quien ya está dentro la encuentre, y para poder mandar
 * el enlace por WhatsApp sin montar otro sitio.
 */
const ASUNTO = 'Consulta sobre los servicios de MyCoachRuns';
const SALUDO = 'Hola Jose, te escribo desde MyCoachRuns. Me interesan tus servicios.';

export default function Servicios() {
  const { sesion, perfil } = usePantalla();

  return (
    <main className="shell">
      <Cabecera titulo="Servicios" nombre={perfil?.full_name} avatar={perfil?.avatar_url}
        frase="Acompañamiento de verdad, dentro y fuera de la app." />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/servicios-pacing.jpg" alt="Jose corriendo en carrera" loading="lazy"
        style={{
          width: '100%', maxHeight: 250, objectFit: 'cover', objectPosition: 'center 20%',
          borderRadius: 18, display: 'block', marginBottom: 16,
        }} />

      <div className="servicio">
        <h3>Pacing en carrera · 5K a 10K</h3>
        <p>Corro contigo y te llevo al ritmo acordado, para que no salgas demasiado rápido ni te quedes corto al final.</p>
        <ul>
          <li>Eventos y carreras populares</li>
          <li>Grupos que buscan una marca en común</li>
          <li>Una sola persona, a tu ritmo objetivo</li>
        </ul>
      </div>

      <div className="servicio">
        <h3>Entrenamiento 1 a 1</h3>
        <p>Un plan hecho para ti y ajustado semana a semana según cómo vayas respondiendo, no una plantilla igual para todos.</p>
        <ul>
          <li>Sesiones estructuradas en la app, con avisos por voz</li>
          <li>Seguimiento de tus carreras y de tu esfuerzo</li>
          <li>Contacto directo por el chat</li>
        </ul>
      </div>

      <div className="servicio">
        <h3>¿Cuánto cuesta?</h3>
        <p>
          Depende de la distancia, de las fechas y de si es para una persona o para un grupo.
          Escríbeme y lo hablamos sin compromiso: te digo qué encaja contigo y cuánto sería.
        </p>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <a className="btn-wa" href={waLink(SALUDO)} target="_blank" rel="noopener noreferrer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.6 14.2c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.2.3 0 .5.2.3.7 1.2 1.6 2 1.1.9 1.9 1.2 2.2 1.4.2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.2 1.5Z" />
          </svg>
          Escríbeme por WhatsApp
        </a>
        <a className="btn ghost block" href={`mailto:${CORREO}?subject=${encodeURIComponent(ASUNTO)}`}>
          Escríbeme por correo
        </a>
        <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', margin: 0 }}>
          {WHATSAPP_VISIBLE} · {CORREO}
        </p>
      </div>

      <Footer />
      <TabBar role={papel(sesion)} />
    </main>
  );
}
