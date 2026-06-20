import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { circleId, requestId, requestUserId } = await request.json();

    if (!circleId || !requestId || !requestUserId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify workspace membership and admin role of the reviewer (bypasses RLS)
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
      return NextResponse.json({ error: 'Only admins can approve join requests' }, { status: 403 });
    }

    // 1. Update join_request status (as admin)
    const { error: requestError } = await adminClient
      .from('join_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', requestId);

    if (requestError) throw requestError;

    // 2. Insert into circle_members (as admin, bypassing RLS insert block)
    const { error: memberError } = await adminClient
      .from('circle_members')
      .insert({
        circle_id: circleId,
        user_id: requestUserId,
        role: 'member'
      });

    if (memberError) {
      // If user is already a member (e.g. concurrent request or double click), don't throw error
      if (memberError.code === '23505') {
        return NextResponse.json({ success: true, message: 'User is already a member' });
      }
      throw memberError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approve request API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to approve join request' }, { status: 500 });
  }
}
