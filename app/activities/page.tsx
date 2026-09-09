import { requireUser } from '@/lib/guard';
import { aligerar } from '@/lib/actividad';
import Activities from '@/components/Activities';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Refrescar from '@/components/Refrescar';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage() {
  const { sb, user, profile } = await requireUser();
  const { data: acts } = await sb.from('activities').select('*')
    .eq('athlete_id', user.id).order('started_at', { ascending: false }).limit(120);
  const total = (acts ?? []).reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000;
  const lista = (acts ?? []).map(aligerar);
  return (
    <main className="shell">
      <Refrescar />
      <div className="topbar"><div className="brand">Coach<span>Run</span></div><span className="muted">{total.toFixed(0)} km en total</span></div>
      <h1>Actividades</h1>
      <Activities acts={lista} />
      <Footer />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
