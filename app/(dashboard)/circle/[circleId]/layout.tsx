import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CircleTabNav } from '@/components/circle/CircleTabNav';

export default async function CircleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { circleId: string };
}) {
  const { circleId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Check membership
  const { data: member } = await supabase
    .from('circle_members')
    .select('role')
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .single();

  if (!member) redirect('/');

  const { data: circle } = await supabase
    .from('circles')
    .select('*')
    .eq('id', circleId)
    .single();

  if (!circle) redirect('/');

  return (
    <div>
      <CircleTabNav circleId={circleId} circleName={circle.name} isAdmin={member.role === 'admin'} />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
