'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pedir } from '@/lib/api';
import LoginForm from '@/components/LoginForm';
import Esqueleto from '@/components/Esqueleto';

export default function Home() {
  const r = useRouter();
  const q = useSearchParams();
  const coach = q.get('coach');
  const entrar = q.get('entrar');
  const [listo, setListo] = useState(false);
  const [nombreCoach, setNombreCoach] = useState<string | null>(null);
  const [sesionRota, setSesionRota] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      // Si venimos rebotados de una pantalla protegida (entrar=1) NO se redirige,
      // aunque haya sesión: así nunca se forma un bucle de idas y venidas.
      if (!entrar) {
        try {
          const res = await pedir('/api/perfil');
          if (res.ok) {
            const { profile } = await res.json();
            if (profile) { r.replace(profile.role === 'coach' ? '/coach' : '/athlete'); return; }
          }
        } catch { /* sin conexión: se enseña el login igual */ }
      } else {
        try { const res = await pedir('/api/perfil'); if (vivo) setSesionRota(res.ok); } catch {}
      }
      if (coach) {
        try {
          const res = await pedir('/api/coach/nombre?id=' + encodeURIComponent(coach));
          if (res.ok && vivo) setNombreCoach((await res.json()).nombre);
        } catch {}
      }
      if (vivo) setListo(true);
    })();
    return () => { vivo = false; };
  }, [coach, entrar, r]);

  if (!listo) return <main className="shell"><Esqueleto /></main>;
  return (
    <LoginForm
      inviteCoachId={nombreCoach ? coach! : undefined}
      inviteCoachName={nombreCoach ?? undefined}
      sesionRota={sesionRota}
    />
  );
}
