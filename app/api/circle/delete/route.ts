import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { circleId } = await request.json();

    if (!circleId) {
      return NextResponse.json({ error: 'Circle ID is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify workspace membership and admin role using admin client (bypasses RLS)
    const adminClient = createAdminClient();
    const { data: member } = await adminClient
      .from('circle_members')
      .select('id, role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete the circle' }, { status: 403 });
    }

    // Delete the circle using the admin client to cascade deletes across all tables
    const { error: deleteError } = await adminClient
      .from('circles')
      .delete()
      .eq('id', circleId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete circle API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete circle' }, { status: 500 });
  }
}
