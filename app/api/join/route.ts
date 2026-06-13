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

    // Find circle by invite code
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('id, name')
      .eq('invite_code', inviteCode)
      .single();

    if (circleError || !circle) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "You're already in this circle" }, { status: 409 });
    }

    // Join the circle
    const { error: joinError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) throw joinError;

    return NextResponse.json({ circleId: circle.id, circleName: circle.name });
  } catch (error: any) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
