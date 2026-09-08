import { requireUser } from '@/lib/guard';
import TabBar from '@/components/TabBar';
import Footer from '@/components/Footer';
import Settings from '@/components/Settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { user, profile } = await requireUser();
  return (
    <main className="shell">
      <h1>Cuenta</h1>
      <Settings me={profile!} email={user.email} />
      <Footer />
      <TabBar role={(profile?.role as 'coach' | 'athlete') ?? 'athlete'} />
    </main>
  );
}
