'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { TYPE_LABEL } from '@/lib/format';

export default function WorkoutForm({ athleteId }: { athleteId: string }) {
  const r = useRouter();
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), type: 'easy', title: '', description: '', target_distance_km: '', target_duration_min: '', target_pace: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  async function save() {
    setSaving(true);
    const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser();
    await sb.from('workouts').insert({
      coach_id: user!.id, athlete_id: athleteId, date: f.date, type: f.type,
      title: f.title || TYPE_LABEL[f.type], description: f.description || null,
      target_distance_km: f.target_distance_km ? Number(f.target_distance_km) : null,
      target_duration_min: f.target_duration_min ? Number(f.target_duration_min) : null,
      target_pace: f.target_pace || null,
    });
    setF({ ...f, title: '', description: '', target_distance_km: '', target_duration_min: '', target_pace: '' });
    setSaving(false); r.refresh();
  }
  return (
    <div className="card">
      <div className="row">
        <div className="field"><label>Fecha</label><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="field"><label>Tipo</label><select value={f.type} onChange={(e) => set('type', e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <div className="field"><label>Título</label><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. 6×800 m con 2' trote" /></div>
      <div className="row">
        <div className="field"><label>Distancia (km)</label><input inputMode="decimal" value={f.target_distance_km} onChange={(e) => set('target_distance_km', e.target.value)} /></div>
        <div className="field"><label>Duración (min)</label><input inputMode="numeric" value={f.target_duration_min} onChange={(e) => set('target_duration_min', e.target.value)} /></div>
      </div>
      <div className="field"><label>Ritmo objetivo (min/km)</label><input value={f.target_pace} onChange={(e) => set('target_pace', e.target.value)} placeholder="5:10–5:30" /></div>
      <div className="field"><label>Indicaciones</label><textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Calentar 15', series a ritmo de 5K, enfriar 10'" /></div>
      <button className="btn flare block" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Asignar'}</button>
    </div>
  );
}
