import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: memberships } = await supabase
    .from('circle_members')
    .select('circle_id, circles(*)')
    .eq('user_id', user.id);

  const circles = memberships?.map((m: any) => m.circles).filter(Boolean) || [];

  return (
    <AppShell profile={profile} circles={circles} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
