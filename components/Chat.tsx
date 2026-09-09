'use client';
import { useEffect, useRef, useState } from 'react';

export type Msg = { id: string; sender_id: string; body: string; created_at: string };

export default function Chat({ hilo, yo, nombreOtro }: { hilo: { coachId: string; athleteId: string }; yo: string; nombreOtro: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [err, setErr] = useState('');
  const fin = useRef<HTMLDivElement>(null);

  async function cargar(scroll = false) {
    try {
      const r = await fetch(`/api/messages?athleteId=${hilo.athleteId}&coachId=${hilo.coachId}`);
      const j = await r.json();
      if (r.ok) setMsgs(j.messages ?? []);
      if (scroll) setTimeout(() => fin.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch {}
    setCargando(false);
  }

  useEffect(() => {
    cargar(true);
    const t = setInterval(() => cargar(false), 12000);   // refresco discreto
    return () => clearInterval(t);
  }, []);

  async function enviar() {
    const body = texto.trim();
    if (!body) return;
    setTexto(''); setErr('');
    const provisional: Msg = { id: `tmp-${Date.now()}`, sender_id: yo, body, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, provisional]);
    setTimeout(() => fin.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    const r = await fetch('/api/messages', { method: 'POST', body: JSON.stringify({ ...hilo, body }) });
    if (!r.ok) { setErr('No se pudo enviar. Inténtalo de nuevo.'); setMsgs((m) => m.filter((x) => x.id !== provisional.id)); setTexto(body); }
    else cargar(true);
  }

  return (
    <div>
      <div className="chat">
        {cargando && <p className="muted" style={{ fontSize: 13 }}>Cargando…</p>}
        {!cargando && !msgs.length && <p className="muted" style={{ fontSize: 14 }}>Aún no hay mensajes con {nombreOtro}. Escribe el primero.</p>}
        {msgs.map((m, i) => {
          const mio = m.sender_id === yo;
          const d = new Date(m.created_at);
          const anterior = msgs[i - 1];
          const nuevoDia = !anterior || new Date(anterior.created_at).toDateString() !== d.toDateString();
          return (
            <div key={m.id}>
              {nuevoDia && <div className="chat-dia">{d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</div>}
              <div className={`burbuja ${mio ? 'mia' : ''}`}>
                {m.body}
                <span className="hora">{d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
        <div ref={fin} />
      </div>
      {err && <p className="notice">{err}</p>}
      <div className="chat-envio">
        <textarea rows={1} value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder={`Mensaje para ${nombreOtro}`} />
        <button className="btn flare" onClick={enviar} disabled={!texto.trim()}>Enviar</button>
      </div>
    </div>
  );
}
