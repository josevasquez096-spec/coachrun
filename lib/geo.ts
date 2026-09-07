export type Point = { lat: number; lng: number; t: number; alt?: number };

export function toGpx(points: Point[], name: string) {
  const trk = points.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}">${p.alt != null ? `<ele>${p.alt}</ele>` : ''}<time>${new Date(p.t).toISOString()}</time></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="CoachRun" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>${trk}</trkseg></trk></gpx>`;
}

/** Distancia haversine en metros. */
export function haversine(a: Point, b: Point) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
