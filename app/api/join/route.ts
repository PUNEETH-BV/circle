import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const inviteCode = request.nextUrl.searchParams.get('code');

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use RPC to look up circle
    const { data: circles, error: rpcError } = await supabase
      .rpc('lookup_circle_by_invite_code', { code: inviteCode });

    if (rpcError || !circles || circles.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const circle = circles[0];

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ 
        status: 'joined', 
        circle: { id: circle.id, name: circle.name, is_private: circle.is_private } 
      });
    }

    // Check if pending request exists
    const { data: existingRequest } = await supabase
      .from('join_requests')
      .select('*')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single();

    if (existingRequest) {
      return NextResponse.json({
        status: existingRequest.status, // 'pending', 'approved', 'rejected'
        circle: { id: circle.id, name: circle.name, is_private: circle.is_private },
        existingRequest
      });
    }

    return NextResponse.json({
      status: 'found',
      circle: { id: circle.id, name: circle.name, is_private: circle.is_private }
    });

  } catch (error: any) {
    console.error('Join GET error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    const { inviteCode, message } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use RPC to look up circle
    const { data: circles, error: rpcError } = await supabase
      .rpc('lookup_circle_by_invite_code', { code: inviteCode });

    if (rpcError || !circles || circles.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const circle = circles[0];

    // Ensure the user has a profile row (upsert using adminSupabase so it succeeds)
    const { error: profileError } = await adminSupabase
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
      // Create or update join request (using admin client to avoid RLS error on update)
      const { error: requestError } = await adminSupabase
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
    console.error('Join POST error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
