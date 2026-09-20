/**
 * Los iconos de la barra de pestañas.
 *
 * Van como SVG dentro del código y no como archivos ni como emojis: los
 * emojis se dibujan distinto en cada teléfono (y en Android quedan de colores
 * chillones), y un archivo por icono son seis peticiones más al abrir.
 *
 * Todos comparten el mismo lienzo de 24 y heredan el color del texto, así que
 * la pestaña activa se tiñe sola.
 */
const base = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

export const IcoAlumnos = () => (
  <svg {...base}><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" /><circle cx="10" cy="8" r="3.2" /><path d="M20 19v-1.4a3.4 3.4 0 0 0-2.6-3.3M15.6 5.2a3.2 3.2 0 0 1 0 5.6" /></svg>
);
export const IcoPlan = () => (
  <svg {...base}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3.2v3.4M16 3.2v3.4M3.5 10h17" /></svg>
);
export const IcoActividades = () => (
  <svg {...base}><path d="M3.5 13.5h4l2.2-6.6 3.4 10.4 2.2-5.3h5.2" /></svg>
);
export const IcoIniciar = () => (
  <svg {...base}><path d="M13.4 2.5 5 13.6h5.6L9.8 21.5 18.5 10h-5.8z" /></svg>
);
export const IcoChat = () => (
  <svg {...base}><path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.6-.34L4 21l1.1-3.6A6.8 6.8 0 0 1 3.5 12.2C3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2Z" /></svg>
);
export const IcoCuenta = () => (
  <svg {...base}><circle cx="12" cy="8" r="3.4" /><path d="M5 20v-.8A4.7 4.7 0 0 1 9.7 14.5h4.6A4.7 4.7 0 0 1 19 19.2V20" /></svg>
);
export const IcoInvitar = () => (
  <svg {...base}><path d="M15.5 19v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3.5 3.5 0 0 0-3.5 3.5V19" /><circle cx="9.5" cy="8" r="3.2" /><path d="M18.5 7.5v5M21 10h-5" /></svg>
);
export const IcoEnlace = () => (
  <svg {...base} width={16} height={16}><path d="M10 13.5a3.5 3.5 0 0 0 5.1.4l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1l-1.4 1.3" /><path d="M14 10.5a3.5 3.5 0 0 0-5.1-.4l-2.4 2.4a3.6 3.6 0 0 0 5.1 5.1l1.4-1.3" /></svg>
);
export const IcoFlecha = () => (
  <svg {...base} width={18} height={18} className="flecha"><path d="M9 5.5 15.5 12 9 18.5" /></svg>
);
