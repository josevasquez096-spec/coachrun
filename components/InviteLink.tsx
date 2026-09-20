'use client';
import { useState } from 'react';
import { IcoInvitar, IcoEnlace } from './Iconos';

export default function InviteLink({ coachId }: { coachId: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${location.origin}/?coach=${coachId}` : '';

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
  async function share() {
    const text = `Únete a mi grupo de entrenamiento en MyCoachRuns: ${link}`;
    if (navigator.share) { try { await navigator.share({ title: 'MyCoachRuns', text, url: link }); return; } catch {} }
    copy();
  }

  return (
    <div className="card-oscura" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span className="icono"><IcoInvitar /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="titulo">Invitar alumnos</div>
          <p className="desc">Comparte el enlace y empieza a construir grandes resultados.</p>
        </div>
        <button className="btn-lima-borde" onClick={share}>
          <IcoEnlace />{copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: '#9FB295', fontSize: 11.5, minWidth: 0 }}>
        <IcoEnlace />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
      </div>
    </div>
  );
}
