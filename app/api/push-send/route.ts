import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';

export async function POST(request: NextRequest) {
  try {
    // Read environment variables
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys not configured. Skipping Web Push notification.');
      return NextResponse.json({ 
        success: false, 
        message: 'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local' 
      }, { status: 200 });
    }

    // Configure Web Push with VAPID keys
    webPush.setVapidDetails(
      `mailto:support@circle.platform`, // Contact email
      publicKey,
      privateKey
    );

    const body = await request.json();
    console.log('Push send request body:', JSON.stringify(body));

    // Support both direct API calls and Supabase Webhook wrapper formats
    let notificationRecord = null;
    
    if (body.record) {
      // Supabase Webhook payload format
      notificationRecord = body.record;
    } else if (body.type && body.user_id) {
      // Direct call format
      notificationRecord = body;
    } else {
      return NextResponse.json({ error: 'Invalid notification data structure' }, { status: 400 });
    }

    const { 
      user_id, 
      title, 
      body: notifBody, 
      type, 
      circle_id, 
      metadata 
    } = notificationRecord;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id for target notification' }, { status: 400 });
    }

    // Build redirection URL based on notification type
    let targetUrl = '/';
    const meta = metadata || {};
    
    if (type === 'join_approved' && meta.circle_id) {
      targetUrl = `/circle/${meta.circle_id}`;
    } else if (type === 'new_join_request' && circle_id) {
      targetUrl = `/circle/${circle_id}/requests`;
    } else if (type === 'file_uploaded' && circle_id) {
      targetUrl = meta.folder_id 
        ? `/circle/${circle_id}/files/${meta.folder_id}`
        : `/circle/${circle_id}/files`;
    } else if (type === 'new_announcement' && circle_id) {
      targetUrl = `/circle/${circle_id}`;
    } else if (circle_id) {
      targetUrl = `/circle/${circle_id}`;
    }

    // Append full origin to the target URL
    const fullUrl = new URL(targetUrl, siteUrl).toString();

    // Fetch all push subscriptions for this user
    const adminClient = createAdminClient();
    const { data: subscriptions, error: fetchError } = await adminClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (fetchError) {
      console.error('Error fetching push subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No active push subscriptions found for user ${user_id}`);
      return NextResponse.json({ success: true, message: 'No subscriptions found' });
    }

    // Construct push payload
    const pushPayload = JSON.stringify({
      title: title || 'Circle Update',
      body: notifBody || 'You have a new update.',
      url: fullUrl,
      tag: type || 'general-notification'
    });

    const sendPromises = subscriptions.map(async (subRecord) => {
      try {
        await webPush.sendNotification(subRecord.subscription, pushPayload);
        return { id: subRecord.id, status: 'success' };
      } catch (err: any) {
        console.error(`Error sending push to subscription ${subRecord.id}:`, err);
        
        // Remove subscription from database if it's expired/invalid (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Deleting expired/invalid subscription: ${subRecord.id}`);
          await adminClient
            .from('push_subscriptions')
            .delete()
            .eq('id', subRecord.id);
        }
        
        return { id: subRecord.id, status: 'failed', error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);

    return NextResponse.json({ 
      success: true, 
      message: `Dispatched to ${results.length} subscriptions`, 
      results 
    });
  } catch (error: any) {
    console.error('Push send API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to dispatch push notification' }, { status: 500 });
  }
}
