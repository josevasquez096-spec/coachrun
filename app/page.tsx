'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pedir, motivoDeFallo } from '@/lib/api';
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
  // Si comprobar la sesión falla, hay que DECIRLO. Callarlo dejaba la pantalla
  // quieta: entrabas con tu contraseña, volvías aquí y no pasaba nada.
  const [fallo, setFallo] = useState('');

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
          } else if (res.status !== 401 && vivo) {
            // 401 es lo normal cuando aún no has entrado; cualquier otra cosa
            // es un problema de verdad y se cuenta.
            setFallo('El servidor respondió ' + res.status + ' al comprobar tu sesión.');
          }
        } catch (e) { if (vivo) setFallo(motivoDeFallo(e)); }
      } else {
        try { const res = await pedir('/api/perfil'); if (vivo) setSesionRota(res.ok); }
        catch (e) { if (vivo) setFallo(motivoDeFallo(e)); }
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
      fallo={fallo}
    />
  );
}
