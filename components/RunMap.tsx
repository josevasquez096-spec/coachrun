'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Point } from '@/lib/geo';

// Los mismos de la paleta; Leaflet no entiende las variables de CSS.
const LIMA = '#94F420', NEGRO = '#0B0D0B';

export default function RunMap({ points }: { points: Point[] }) {
  const el = useRef<HTMLDivElement>(null); const map = useRef<L.Map | null>(null); const line = useRef<L.Polyline | null>(null); const borde = useRef<L.Polyline | null>(null); const dot = useRef<L.CircleMarker | null>(null);
  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    // Dos trazos: uno negro por debajo y el lima encima. El lima solo, sobre un
    // mapa claro, se pierde; con el contorno negro se ve siempre.
    borde.current = L.polyline([], { color: NEGRO, weight: 9, opacity: .55 }).addTo(map.current);
    line.current = L.polyline([], { color: LIMA, weight: 5 }).addTo(map.current);
    dot.current = L.circleMarker([0, 0], { radius: 7, color: '#fff', weight: 2, fillColor: NEGRO, fillOpacity: 1 }).addTo(map.current);
    navigator.geolocation?.getCurrentPosition((p) => map.current?.setView([p.coords.latitude, p.coords.longitude], 16));
  }, []);
  useEffect(() => {
    if (!map.current || !points.length) return;
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    borde.current?.setLatLngs(latlngs); line.current?.setLatLngs(latlngs); dot.current?.setLatLng(latlngs[latlngs.length - 1]);
    map.current.panTo(latlngs[latlngs.length - 1]);
  }, [points]);
  return <div ref={el} style={{ height: '100%', width: '100%' }} />;
}
