'use client';
import { useState } from 'react';
import { type Phase, KIND_LABEL, describe, parsePace, fmtPaceStr, totalMeters, totalSeconds } from '@/lib/phases';

const uid = () => Math.random().toString(36).slice(2, 9);

export default function PhaseBuilder({ phases, onChange }: { phases: Phase[]; onChange: (p: Phase[]) => void }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ name: '', kind: 'active' as Phase['kind'], mode: 'distance' as 'distance' | 'time',
    amount: '', paceLow: '', paceHigh: '', times: '1', restMode: 'time' as 'distance' | 'time', restAmount: '' });

  function add() {
    const times = Math.max(1, Number(d.times) || 1);
    const amount = Number(d.amount) || 0;
    const p: Phase = {
      id: uid(),
      name: d.name || KIND_LABEL[d.kind],
      kind: d.kind,
      mode: d.mode,
      meters: d.mode === 'distance' ? Math.round(amount * 1000) : undefined,
      seconds: d.mode === 'time' ? Math.round(amount * 60) : undefined,
      paceLow: parsePace(d.paceLow), paceHigh: parsePace(d.paceHigh),
      times,
    };
    if (times > 1 && d.restAmount) {
      const ra = Number(d.restAmount) || 0;
      p.rest = d.restMode === 'time' ? { mode: 'time', seconds: Math.round(ra * 60) } : { mode: 'distance', meters: Math.round(ra * 1000) };
    }
    onChange([...phases, p]);
    setD({ ...d, name: '', amount: '', paceLow: '', paceHigh: '', times: '1', restAmount: '' });
    setOpen(false);
  }
  const move = (i: number, dir: -1 | 1) => {
    const a = [...phases]; const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  };

  const km = totalMeters(phases) / 1000;
  const min = Math.round(totalSeconds(phases) / 60);

  return (
    <div style={{ marginTop: 4 }}>
      {phases.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {phases.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--track)', color: 'var(--flare-ink)', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{describe(p)}</div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => move(i, -1)}>↑</button>
                <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => move(i, 1)}>↓</button>
                <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => onChange(phases.filter((x) => x.id !== p.id))}>×</button>
              </div>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Total aproximado: {km.toFixed(2)} km · {min} min</p>
        </div>
      )}

      {!open ? (
        <button className="btn ghost block" onClick={() => setOpen(true)}>+ Añadir fase</button>
      ) : (
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12 }}>
          <div className="row">
            <div className="field"><label>Tipo</label>
              <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as Phase['kind'] })}>
                {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="field"><label>Repeticiones</label>
              <input inputMode="numeric" value={d.times} onChange={(e) => setD({ ...d, times: e.target.value })} /></div>
          </div>
          <div className="field"><label>Nombre</label>
            <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Ej. 800 fuertes" /></div>
          <div className="row">
            <div className="field"><label>Medir por</label>
              <select value={d.mode} onChange={(e) => setD({ ...d, mode: e.target.value as 'distance' | 'time' })}>
                <option value="distance">Distancia (km)</option><option value="time">Tiempo (min)</option>
              </select></div>
            <div className="field"><label>{d.mode === 'distance' ? 'Kilómetros' : 'Minutos'}</label>
              <input inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder={d.mode === 'distance' ? '0.8' : '10'} /></div>
          </div>
          <div className="row">
            <div className="field"><label>Ritmo rápido</label>
              <input value={d.paceLow} onChange={(e) => setD({ ...d, paceLow: e.target.value })} placeholder="4:00" /></div>
            <div className="field"><label>Ritmo lento</label>
              <input value={d.paceHigh} onChange={(e) => setD({ ...d, paceHigh: e.target.value })} placeholder="4:20" /></div>
          </div>
          {Number(d.times) > 1 && (
            <div className="row">
              <div className="field"><label>Recuperación por</label>
                <select value={d.restMode} onChange={(e) => setD({ ...d, restMode: e.target.value as 'distance' | 'time' })}>
                  <option value="time">Tiempo (min)</option><option value="distance">Distancia (km)</option>
                </select></div>
              <div className="field"><label>{d.restMode === 'time' ? 'Minutos' : 'Kilómetros'}</label>
                <input inputMode="decimal" value={d.restAmount} onChange={(e) => setD({ ...d, restAmount: e.target.value })} placeholder={d.restMode === 'time' ? '2' : '0.4'} /></div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn flare" style={{ flex: 1 }} onClick={add} disabled={!d.amount}>Añadir</button>
            <button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
