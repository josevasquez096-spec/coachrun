'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { TYPE_LABEL } from '@/lib/format';
import PhaseBuilder from './PhaseBuilder';
import { type Phase, totalMeters, totalSeconds } from '@/lib/phases';

export default function WorkoutForm({ athleteId }: { athleteId: string }) {
  const r = useRouter();
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), type: 'easy', title: '', description: '', target_pace: '' });
  const [phases, setPhases] = useState<Phase[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  async function save() {
    setSaving(true);
    const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('workouts').insert({
      coach_id: user!.id, athlete_id: athleteId, date: f.date, type: f.type,
      title: f.title || TYPE_LABEL[f.type], description: f.description || null,
      target_distance_km: phases.length ? Number((totalMeters(phases) / 1000).toFixed(2)) : null,
      target_duration_min: phases.length ? Math.round(totalSeconds(phases) / 60) : null,
      target_pace: f.target_pace || null,
      phases: phases.length ? phases : null,
    });
    if (!error) {
      const fecha = new Date(f.date + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
      fetch('/api/push/notify', { method: 'POST', body: JSON.stringify({
        athleteId, title: 'Entrenamiento nuevo', body: `${f.title || TYPE_LABEL[f.type]} — ${fecha}`,
      }) }).catch(() => {});
    }
    setF({ ...f, title: '', description: '', target_pace: '' }); setPhases([]);
    setSaving(false); r.refresh();
  }

  return (
    <div className="card">
      <div className="row">
        <div className="field"><label>Fecha</label><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="field"><label>Tipo</label><select value={f.type} onChange={(e) => set('type', e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <div className="field"><label>Título</label><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Series 6×800" /></div>

      <h2 style={{ fontSize: 15, margin: '14px 0 4px' }}>Fases</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>El alumno las verá una a una mientras corre, con avisos al terminar cada una.</p>
      <PhaseBuilder phases={phases} onChange={setPhases} />

      <div className="field" style={{ marginTop: 14 }}><label>Notas</label>
        <textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Sensaciones a buscar, material, terreno…" /></div>
      <button className="btn flare block" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Asignar'}</button>
    </div>
  );
}
