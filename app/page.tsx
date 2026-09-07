import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (user) {
    const { data: p } = await supabaseServer().from('profiles').select('role').eq('id', user.id).single();
    redirect(p?.role === 'coach' ? '/coach' : '/athlete');
  }
  return <LoginForm />;
}
