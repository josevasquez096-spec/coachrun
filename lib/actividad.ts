/**
 * Recorta la respuesta de Strava a lo que las pantallas usan de verdad.
 *
 * `activities.raw` guarda la respuesta entera de Strava, que trae mapas,
 * segmentos y esfuerzos: son cientos de kilobytes por carrera. Enviar eso al
 * teléfono hacía lenta la pestaña de Actividades. Aquí se queda solo lo que se
 * dibuja: los parciales por kilómetro, el desnivel, las calorías y el enlace.
 */
export function aligerar<T extends { raw?: any }>(a: T): T {
  const r: any = a?.raw;
  if (!r) return a;
  return {
    ...a,
    raw: {
      id: r.id ?? null,
      calories: r.calories ?? null,
      total_elevation_gain: r.total_elevation_gain ?? null,
      splits_metric: Array.isArray(r.splits_metric)
        ? r.splits_metric.map((s: any) => ({
            distance: s.distance, moving_time: s.moving_time,
            average_heartrate: s.average_heartrate ?? null,
          }))
        : null,
    },
  };
}
