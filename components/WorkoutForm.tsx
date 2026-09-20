'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { TYPE_LABEL, todayLocal } from '@/lib/format';
import PhaseBuilder from './PhaseBuilder';
import { type Phase, totalMeters, totalSeconds } from '@/lib/phases';
import MapaMusculos from './MapaMusculos';
import { pedir } from '@/lib/api';
import { refrescar, usePantalla } from '@/lib/pantalla';

type Existing = {
  id: string; date: string; type: string; title: string; description: string | null; muscles?: string[] | null;
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
  const [musculos, setMusculos] = useState<string[]>(existing?.muscles ?? []);

  // Asignar a varios de una vez. Antes había que copiar y pegar alumno por
  // alumno. El alumno de esta ficha va siempre incluido y no se puede quitar:
  // estás en SU ficha.
  const [otros, setOtros] = useState<{ id: string; full_name: string | null }[]>([]);
  const [tambien, setTambien] = useState<string[]>([]);
  // El id del coach sale de la sesión que ya está en memoria, no de una
  // consulta nueva: `auth.getUser()` es una llamada a la red, y aquí no hace
  // falta porque la pantalla de arriba ya la hizo.
  const { sesion } = usePantalla();
  const coachId = sesion?.user.id;
  useEffect(() => {
    if (existing || !coachId) return;        // al editar no tiene sentido
    (async () => {
      const { data } = await supabaseBrowser().from('profiles').select('id,full_name')
        .eq('coach_id', coachId).neq('id', athleteId).order('full_name');
      setOtros(data ?? []);
    })();
  }, [athleteId, existing, coachId]);
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
    // Solo tiene sentido en fuerza; en una carrera se guarda vacío para que no
    // quede colgando de un entrenamiento al que se le cambió el tipo.
    muscles: f.type === 'strength' && musculos.length ? musculos : null,
  });

  async function save() {
    setSaving(true); setErr('');
    // Si algo se cuelga, el botón vuelve solo a los 15 s en vez de quedarse pensando.
    const corta = new AbortController();
    const reloj = setTimeout(() => corta.abort(), 15000);
    try {
      if (existing) {
        const res = await pedir(`/api/workouts/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload()), signal: corta.signal });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setErr(j.error ?? 'No se pudo guardar.'); return; }
        onDone?.(); refrescar();
        return;
      }
      // Va por la ruta del servidor y no directo a la base de datos: allí se
      // comprueba que cada alumno sea de este coach. Insertando desde aquí,
      // las reglas solo miraban que el entrenamiento llevara tu firma, no a
      // quién se lo asignabas.
      const p = payload();
      const res = await pedir('/api/workouts/copiar', {
        method: 'POST', signal: corta.signal,
        body: JSON.stringify({
          athleteIds: [athleteId, ...tambien], date: f.date,
          workout: { ...p, title: p.title },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? 'No se pudo guardar.'); return; }
      setF({ ...f, title: '', description: '', target_pace: '' }); setPhases([]); setTambien([]);
      onDone?.(); refrescar();
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

      {!existing && otros.length > 0 && (
        <div className="field">
          <label>Asignar también a</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {otros.map((a) => {
              const on = tambien.includes(a.id);
              return (
                <button key={a.id} type="button"
                  onClick={() => setTambien((t) => on ? t.filter((x) => x !== a.id) : [...t, a.id])}
                  style={{
                    padding: '7px 13px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                    background: on ? 'var(--lima)' : 'transparent',
                    color: 'var(--ink)',
                  }}>{on ? '✓ ' : ''}{a.full_name || 'Sin nombre'}</button>
              );
            })}
          </div>
          {tambien.length > 0 && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              Se creará el mismo entrenamiento para <b>{tambien.length + 1} alumnos</b>.
            </p>
          )}
        </div>
      )}

      {f.type === 'strength' && (
        <div className="field">
          <label>Músculos trabajados</label>
          <MapaMusculos marcados={musculos} id="asignar"
            alTocar={(id) => setMusculos((m) => m.includes(id) ? m.filter((x) => x !== id) : [...m, id])} />
        </div>
      )}
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
