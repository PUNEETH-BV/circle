import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { fileName, fileType } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const filePath = `profiles/${user.id}/${Date.now()}-${fileName}`;
    const adminClient = createAdminClient();
    
    // Generate signed upload URL for profiles folder
    const { data, error } = await adminClient.storage
      .from('circle-files')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return NextResponse.json({ 
      signedUrl: data.signedUrl, 
      filePath 
    });
  } catch (error: any) {
    console.error('Profile upload API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
