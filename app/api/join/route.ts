import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use the security definer RPC function to look up circles by invite code
    // This bypasses RLS so non-members can find circles to join
    const { data: circles, error: rpcError } = await supabase
      .rpc('lookup_circle_by_invite_code', { code: inviteCode });

    if (rpcError || !circles || circles.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const circle = circles[0];

    // Check if already a member using user's own view (RLS allows viewing own membership)
    const { data: existing } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "You're already in this circle" }, { status: 409 });
    }

    // Ensure the user has a profile row (may be missing if signup trigger didn't fire)
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

    // Join the circle
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

    return NextResponse.json({ circleId: circle.id, circleName: circle.name });
  } catch (error: any) {
    console.error('Join route error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
