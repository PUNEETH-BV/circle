import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { circleId, fileName, fileType } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify membership
    const { data: member } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    const filePath = `${circleId}/${user.id}/${Date.now()}-${fileName}`;

    const { data, error } = await supabase.storage
      .from('circle-files')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return NextResponse.json({ 
      signedUrl: data.signedUrl, 
      path: data.path,
      token: data.token,
      filePath 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
