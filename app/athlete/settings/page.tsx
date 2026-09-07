import { requireUser } from '@/lib/guard';
import TabBar from '@/components/TabBar';
import Settings from '@/components/Settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { profile } = await requireUser();
  return (
    <main className="shell">
      <h1>Cuenta</h1>
      <Settings me={profile!} />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
