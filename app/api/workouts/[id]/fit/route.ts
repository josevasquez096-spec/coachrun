import { supabaseServer } from '@/lib/supabase-server';
import { buildWorkoutFit, type FitStep } from '@/lib/fit';
import { expand, type Phase } from '@/lib/phases';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const { data: w } = await sb.from('workouts').select('title,phases').eq('id', params.id).single();
  if (!w?.phases) return new Response('Este entrenamiento no tiene fases', { status: 404 });

  const steps: FitStep[] = expand(w.phases as Phase[]).map((s) => ({
    name: s.name.slice(0, 22),
    duration: s.mode === 'distance'
      ? { type: 'distance' as const, meters: s.meters ?? 0 }
      : { type: 'time' as const, seconds: s.seconds ?? 0 },
    paceLow: s.paceLow, paceHigh: s.paceHigh,
    intensity: s.kind,
  }));

  const fit = buildWorkoutFit(w.title.slice(0, 30), steps);
  const safe = w.title.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 30) || 'entrenamiento';
  return new Response(Buffer.from(fit), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safe}.fit"`,
    },
  });
}
