/** Datos de la marca, en un solo sitio para no repetirlos por ahí sueltos. */
export const CORREO = 'mycoachruns@gmail.com';
export const INSTAGRAM = 'https://instagram.com/mycoachruns';
export const STRAVA_COACH = 'https://www.strava.com/athletes/145304552';
export const APOYO = 'https://paypal.me/JoseV2403';

/** WhatsApp del entrenador. El enlace `wa.me` va sin +, sin espacios ni guiones. */
export const WHATSAPP = '18094589751';
export const WHATSAPP_VISIBLE = '+1 809 458 9751';
export const waLink = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

/**
 * El logo con el corredor y el lema. Va sobre fondo claro: lleva letra oscura
 * y sobre negro no se leería. El icono de la app (`public/icons/`) es otro, el
 * del símbolo sobre fondo oscuro, y ese no se toca.
 */
export const LOGO = '/logo-mycoachruns.png';
