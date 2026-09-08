'use client';
import { useState } from 'react';

export default function InviteLink({ coachId }: { coachId: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${location.origin}/?coach=${coachId}` : '';

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
  async function share() {
    const text = `Únete a mi grupo de entrenamiento en CoachRun: ${link}`;
    if (navigator.share) { try { await navigator.share({ title: 'CoachRun', text, url: link }); return; } catch {} }
    copy();
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>Invitar alumnos</div>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>Manda este enlace por WhatsApp. Quien lo abra queda en tu grupo al crear su cuenta, sin pegar códigos.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn flare" style={{ flex: 1 }} onClick={share}>Compartir enlace</button>
        <button className="btn ghost" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar'}</button>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8, wordBreak: 'break-all' }}>{link}</p>
    </div>
  );
}
