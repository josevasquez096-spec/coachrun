'use client';
import { useState } from 'react';
import { type Phase, parsePace, fmtPaceStr, totalMeters, totalSeconds, expand } from '@/lib/phases';
import { TIPOS_FASE, describirFase, t, useIdioma } from '@/lib/idioma';

const uid = () => Math.random().toString(36).slice(2, 9);

type Draft = {
  name: string; kind: Phase['kind']; mode: 'distance' | 'time'; amount: string;
  paceLow: string; paceHigh: string; times: string;
  hasRest: boolean; restName: string; restMode: 'distance' | 'time'; restAmount: string; restActivo: boolean;
  restAfter: boolean; hrZone: string;
};

const empty: Draft = {
  name: '', kind: 'active', mode: 'distance', amount: '', paceLow: '', paceHigh: '', times: '1',
  hasRest: false, restName: '', restMode: 'time', restAmount: '', restActivo: true, restAfter: false, hrZone: '',
};

function toDraft(p: Phase): Draft {
  return {
    name: p.name, kind: p.kind, mode: p.mode,
    amount: p.mode === 'distance' ? String((p.meters ?? 0) / 1000) : String((p.seconds ?? 0) / 60),
    paceLow: fmtPaceStr(p.paceLow), paceHigh: fmtPaceStr(p.paceHigh),
    times: String(p.times ?? 1),
    hasRest: !!p.rest,
    restName: p.rest?.name ?? '',
    restMode: p.rest?.mode ?? 'time',
    restAmount: p.rest ? String(p.rest.mode === 'time' ? (p.rest.seconds ?? 0) / 60 : (p.rest.meters ?? 0) / 1000) : '',
    restActivo: p.rest?.activo !== false,
    restAfter: !!p.restAfter,
    hrZone: p.hrZone ? String(p.hrZone) : '',
  };
}

function fromDraft(d: Draft, id: string): Phase {
  const amount = Number(d.amount) || 0;
  const times = Math.max(1, Number(d.times) || 1);
  const p: Phase = {
    id, name: d.name || TIPOS_FASE()[d.kind], kind: d.kind, mode: d.mode,
    meters: d.mode === 'distance' ? Math.round(amount * 1000) : undefined,
    seconds: d.mode === 'time' ? Math.round(amount * 60) : undefined,
    paceLow: parsePace(d.paceLow), paceHigh: parsePace(d.paceHigh),
    hrZone: d.hrZone ? Number(d.hrZone) : undefined,
    times,
  };
  if (d.hasRest && d.restAmount) {
    const ra = Number(d.restAmount) || 0;
    p.rest = {
      mode: d.restMode,
      seconds: d.restMode === 'time' ? Math.round(ra * 60) : undefined,
      meters: d.restMode === 'distance' ? Math.round(ra * 1000) : undefined,
      name: d.restName || undefined,
      activo: d.restActivo,
    };
    p.restAfter = d.restAfter;
  }
  return p;
}

export default function PhaseBuilder({ phases, onChange }: { phases: Phase[]; onChange: (p: Phase[]) => void }) {
  useIdioma();   // para que los textos cambien al cambiar de idioma
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [d, setD] = useState<Draft>(empty);
  const set = (k: keyof Draft, v: any) => setD({ ...d, [k]: v });

  function startNew() { setD(empty); setEditing('new'); }
  function startEdit(p: Phase) { setD(toDraft(p)); setEditing(p.id); }
  function commit() {
    if (editing === 'new') onChange([...phases, fromDraft(d, uid())]);
    else onChange(phases.map((p) => (p.id === editing ? fromDraft(d, p.id) : p)));
    setEditing(null); setD(empty);
  }
  const move = (i: number, dir: -1 | 1) => {
    const a = [...phases]; const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  };
  const dup = (p: Phase) => onChange([...phases, { ...p, id: uid() }]);

  const km = totalMeters(phases) / 1000;
  const min = Math.round(totalSeconds(phases) / 60);
  const nSteps = expand(phases).length;
  const times = Math.max(1, Number(d.times) || 1);

  return (
    <div style={{ marginTop: 4 }}>
      {phases.map((p, i) => (
        <div key={p.id}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--track)', color: 'var(--flare-ink)', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
            <button onClick={() => (editing === p.id ? setEditing(null) : startEdit(p))}
              style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{describirFase(p)}</div>
            </button>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, borderColor: 'var(--verde-txt)', color: 'var(--verde-txt)' }}
                onClick={() => (editing === p.id ? setEditing(null) : startEdit(p))}>
                {editing === p.id ? t('com.cerrar') : t('plan.editar')}
              </button>
              <button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => move(i, -1)} title={t('fase.subir')}>↑</button>
              <button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => move(i, 1)} title={t('fase.bajar')}>↓</button>
              <button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => dup(p)} title={t('fase.duplicar')}>⧉</button>
              <button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { if (confirm(t('fase.borrarPregunta', { nombre: p.name }))) { onChange(phases.filter((x) => x.id !== p.id)); if (editing === p.id) setEditing(null); } }} title={t('plan.borrar')}>×</button>
            </div>
          </div>
          {editing === p.id && <Form d={d} set={set} times={times} onCommit={commit} onCancel={() => setEditing(null)} label={t('form.guardarCambios')} />}
        </div>
      ))}

      {phases.length > 0 && (
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{t('fase.pasos', { n: nSteps, km: km.toFixed(2), min })}</p>
      )}

      {editing === 'new'
        ? <Form d={d} set={set} times={times} onCommit={commit} onCancel={() => setEditing(null)} label={t('fase.anadir')} />
        : <button className="btn ghost block" onClick={startNew}>{t('fase.anadirFase')}</button>}
    </div>
  );
}

function Form({ d, set, times, onCommit, onCancel, label }: {
  d: Draft; set: (k: keyof Draft, v: any) => void; times: number;
  onCommit: () => void; onCancel: () => void; label: string;
}) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, marginTop: 8 }}>
      <div className="row">
        <div className="field"><label>{t('form.tipo')}</label>
          <select value={d.kind} onChange={(e) => set('kind', e.target.value)}>
            {Object.entries(TIPOS_FASE()).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div className="field"><label>{t('fase.repeticiones')}</label>
          <input inputMode="numeric" value={d.times} onChange={(e) => set('times', e.target.value)} /></div>
      </div>
      <div className="field"><label>{t('fase.nombre')}</label>
        <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder={t('fase.nombrePista')} /></div>
      <div className="row">
        <div className="field"><label>{t('fase.medirPor')}</label>
          <select value={d.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="distance">{t('fase.distancia')}</option><option value="time">{t('fase.tiempo')}</option>
          </select></div>
        <div className="field"><label>{t(d.mode === 'distance' ? 'fase.kilometros' : 'fase.minutos')}</label>
          <input inputMode="decimal" value={d.amount} onChange={(e) => set('amount', e.target.value)} placeholder={d.mode === 'distance' ? '0.2' : '10'} /></div>
      </div>
      <div className="row">
        <div className="field"><label>{t('fase.ritmoRapido')}</label>
          <input value={d.paceLow} onChange={(e) => set('paceLow', e.target.value)} placeholder="3:40" /></div>
        <div className="field"><label>{t('fase.ritmoLento')}</label>
          <input value={d.paceHigh} onChange={(e) => set('paceHigh', e.target.value)} placeholder="3:55" /></div>
      </div>
      <div className="field"><label>{t('fase.zona')}</label>
        <select value={d.hrZone} onChange={(e) => set('hrZone', e.target.value)}>
          <option value="">{t('fase.sinZona')}</option>
          <option value="1">{t('fase.zona1')}</option>
          <option value="2">{t('fase.zona2')}</option>
          <option value="3">{t('fase.zona3')}</option>
          <option value="4">{t('fase.zona4')}</option>
          <option value="5">{t('fase.zona5')}</option>
        </select></div>

      {times > 1 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            <input type="checkbox" checked={d.hasRest} onChange={(e) => set('hasRest', e.target.checked)} style={{ width: 18, height: 18 }} />
            {t('fase.recuEntre')}
          </label>
          {d.hasRest && (
            <>
              <div className="row">
                <div className="field"><label>{t('fase.medirPor')}</label>
                  <select value={d.restMode} onChange={(e) => set('restMode', e.target.value)}>
                    <option value="time">{t('fase.tiempo')}</option><option value="distance">{t('fase.distancia')}</option>
                  </select></div>
                <div className="field"><label>{t(d.restMode === 'time' ? 'fase.minutos' : 'fase.kilometros')}</label>
                  <input inputMode="decimal" value={d.restAmount} onChange={(e) => set('restAmount', e.target.value)} placeholder={d.restMode === 'time' ? '1.5' : '0.2'} /></div>
              </div>
              <div className="field"><label>{t('fase.nombreRecu')}</label>
                <input value={d.restName} onChange={(e) => set('restName', e.target.value)} placeholder={t('fase.troteSuave')} /></div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 6 }}>
                <input type="checkbox" checked={d.restActivo} onChange={(e) => set('restActivo', e.target.checked)} style={{ width: 18, height: 18 }} />
                {t('fase.trotando')}
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input type="checkbox" checked={d.restAfter} onChange={(e) => set('restAfter', e.target.checked)} style={{ width: 18, height: 18 }} />
                {t('fase.trasUltima')}
              </label>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn flare" style={{ flex: 1 }} onClick={onCommit} disabled={!d.amount}>{label}</button>
        <button className="btn ghost" onClick={onCancel}>{t('com.cancelar')}</button>
      </div>
    </div>
  );
}
