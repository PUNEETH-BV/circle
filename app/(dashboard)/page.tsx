import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HomeContent } from '@/components/circle/HomeContent';

export default async function HomePage() {
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
    .select(`
      circle_id,
      circles (
        *
      )
    `)
    .eq('user_id', user.id);

  const circles = memberships?.map((m: any) => m.circles).filter(Boolean) || [];

  // Get member counts and file counts for each circle
  const circlesWithCounts = await Promise.all(
    circles.map(async (circle: any) => {
      const { count: memberCount } = await supabase
        .from('circle_members')
        .select('*', { count: 'exact', head: true })
        .eq('circle_id', circle.id);

      const { count: fileCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('circle_id', circle.id);

      return {
        ...circle,
        member_count: memberCount || 0,
        file_count: fileCount || 0,
      };
    })
  );

  return (
    <HomeContent
      profile={profile}
      circles={circlesWithCounts}
    />
  );
}
