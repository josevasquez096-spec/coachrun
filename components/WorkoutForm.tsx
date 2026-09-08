'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { TYPE_LABEL, todayLocal } from '@/lib/format';
import PhaseBuilder from './PhaseBuilder';
import { type Phase, totalMeters, totalSeconds } from '@/lib/phases';

type Existing = {
  id: string; date: string; type: string; title: string; description: string | null;
  target_pace: string | null; phases: Phase[] | null;
};

export default function WorkoutForm({ athleteId, existing, onDone }: { athleteId: string; existing?: Existing; onDone?: () => void }) {
  const r = useRouter();
  const [f, setF] = useState({
    date: existing?.date ?? todayLocal(),
    type: existing?.type ?? 'easy',
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    target_pace: existing?.target_pace ?? '',
  });
  const [phases, setPhases] = useState<Phase[]>(existing?.phases ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const payload = () => ({
    date: f.date, type: f.type,
    title: f.title || TYPE_LABEL[f.type],
    description: f.description || null,
    target_distance_km: phases.length ? Number((totalMeters(phases) / 1000).toFixed(2)) : null,
    target_duration_min: phases.length ? Math.round(totalSeconds(phases) / 60) : null,
    target_pace: f.target_pace || null,
    phases: phases.length ? phases : null,
  });

  async function save() {
    setSaving(true); setErr('');
    // Si algo se cuelga, el botón vuelve solo a los 15 s en vez de quedarse pensando.
    const corta = new AbortController();
    const reloj = setTimeout(() => corta.abort(), 15000);
    try {
      if (existing) {
        const res = await fetch(`/api/workouts/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload()), signal: corta.signal });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setErr(j.error ?? 'No se pudo guardar.'); return; }
        onDone?.(); r.refresh();
        return;
      }
      const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser();
      if (!user) { setErr('Tu sesión caducó. Entra de nuevo.'); return; }
      const { error } = await sb.from('workouts').insert({ coach_id: user.id, athlete_id: athleteId, ...payload() });
      if (error) { setErr(error.message); return; }
      const fecha = new Date(f.date + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
      fetch('/api/push/notify', { method: 'POST', body: JSON.stringify({
        athleteId, title: 'Entrenamiento nuevo', body: `${f.title || TYPE_LABEL[f.type]} — ${fecha}`,
      }) }).catch(() => {});
      setF({ ...f, title: '', description: '', target_pace: '' }); setPhases([]);
      onDone?.(); r.refresh();
    } catch (e: any) {
      setErr(e?.name === 'AbortError' ? 'El servidor tardó demasiado. Revisa la conexión e inténtalo otra vez.' : (e?.message ?? 'No se pudo guardar.'));
    } finally {
      clearTimeout(reloj);
      setSaving(false);
    }
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
      {err && <p className="notice">{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn flare" style={{ flex: 1 }} onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : existing ? 'Guardar cambios' : 'Asignar'}
        </button>
        {existing && <button className="btn ghost" onClick={onDone}>Cancelar</button>}
      </div>
    </div>
  );
}
