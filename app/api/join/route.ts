import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { inviteCode, message } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use the security definer RPC function to look up circles by invite code
    const { data: circles, error: rpcError } = await supabase
      .rpc('lookup_circle_by_invite_code', { code: inviteCode });

    if (rpcError || !circles || circles.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const circle = circles[0];

    // Ensure the user has a profile row (upsert)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "You're already in this circle", status: 'joined', circleId: circle.id }, { status: 409 });
    }

    if (circle.is_private) {
      // Check for existing join request
      const { data: existingRequest } = await supabase
        .from('join_requests')
        .select('*')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return NextResponse.json({ error: 'You already have a pending request for this circle', status: 'requested' }, { status: 409 });
        }
        if (existingRequest.status === 'approved') {
          // Double check: if approved request exists but membership was deleted, we let them request again.
          // Otherwise, they are already a member and would have hit the check above.
        }
      }

      // Create join request
      const { error: requestError } = await supabase
        .from('join_requests')
        .upsert({
          circle_id: circle.id,
          user_id: user.id,
          status: 'pending',
          message: message?.trim() || null,
          requested_at: new Date().toISOString()
        }, { onConflict: 'circle_id,user_id' });

      if (requestError) throw requestError;

      return NextResponse.json({ status: 'requested', circleName: circle.name });
    } else {
      // Public — join immediately
      const { error: joinError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circle.id,
          user_id: user.id,
          role: 'member',
        });

      if (joinError) {
        console.error('Join error:', joinError);
        return NextResponse.json({ error: joinError.message || 'Failed to join circle' }, { status: 500 });
      }

      return NextResponse.json({ status: 'joined', circleId: circle.id, circleName: circle.name });
    }
  } catch (error: any) {
    console.error('Join route error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
