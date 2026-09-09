import { requireUser } from '@/lib/guard';
import TabBar from '@/components/TabBar';
import Refrescar from '@/components/Refrescar';
import Footer from '@/components/Footer';
import Settings from '@/components/Settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { sb, user, profile } = await requireUser();
  const { data: hr } = await sb.from('profiles').select('max_hr,resting_hr').eq('id', user.id).maybeSingle();
  return (
    <main className="shell">
      <Refrescar />
      <h1>Cuenta</h1>
      <Settings me={{ ...profile!, ...(hr ?? {}) }} email={user.email} />
      <Footer />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
