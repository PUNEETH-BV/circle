'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/types';
import { toast } from 'sonner';

// Helper function to convert VAPID public key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Track browser native notification permission status
  const [nativePermission, setNativePermission] = useState<NotificationPermission>('default');
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    // Check support for notifications & service worker
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setIsPushSupported(supported);
      if ('Notification' in window) {
        setNativePermission(Notification.permission);
      }
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Realtime subscription for notifications table
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newNotif = payload.new as AppNotification;
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });

        // Trigger native notification if tab is in the background or minimized
        const isTabBackground = typeof document !== 'undefined' && document.visibilityState !== 'visible';
        
        if (Notification.permission === 'granted' && isTabBackground) {
          try {
            // Find redirection URL based on type
            let redirectUrl = '/';
            const meta = newNotif.metadata || {};
            if (newNotif.type === 'join_approved' && meta.circle_id) {
              redirectUrl = `/circle/${meta.circle_id}`;
            } else if (newNotif.type === 'new_join_request' && newNotif.circle_id) {
              redirectUrl = `/circle/${newNotif.circle_id}/requests`;
            } else if (newNotif.type === 'file_uploaded' && newNotif.circle_id) {
              redirectUrl = meta.folder_id 
                ? `/circle/${newNotif.circle_id}/files/${meta.folder_id}`
                : `/circle/${newNotif.circle_id}/files`;
            } else if (newNotif.circle_id) {
              redirectUrl = `/circle/${newNotif.circle_id}`;
            }

            const nativeNotif = new Notification(newNotif.title, {
              body: newNotif.body || undefined,
              tag: newNotif.type || 'general-notification',
              icon: '/logo.png', // custom icon fallback
            });

            nativeNotif.onclick = () => {
              window.focus();
              window.location.href = redirectUrl;
            };
          } catch (err) {
            console.error('Failed to show native browser notification:', err);
          }
        }

        // Show standard in-app toast regardless of visibility
        toast(newNotif.title, {
          description: newNotif.body,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const updatedNotif = payload.new as AppNotification;
        setNotifications(prev =>
          prev.map(n => (n.id === updatedNotif.id ? updatedNotif : n))
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  async function fetchNotifications(uid: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data as AppNotification[]) || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  // Request browser permission and register push subscription
  async function requestNativePermission() {
    if (!isPushSupported) {
      toast.error('Native notifications are not fully supported on this device/browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNativePermission(permission);

      if (permission === 'granted') {
        // Register the Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);

        // Subscribe to Web Push if VAPID key is available
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey) {
          try {
            // Check for existing subscription first
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
              // Create new subscription
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
              });
            }

            // Save subscription details on the backend
            const response = await fetch('/api/push-subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ subscription }),
            });

            const resData = await response.json();
            if (!response.ok) {
              throw new Error(resData.error || 'Failed to save subscription');
            }

            toast.success('Native browser push notifications enabled!');
          } catch (pushErr: any) {
            console.warn('Web Push subscription failed, fallback to active tab notifications:', pushErr);
            toast.info('Enabled active tab native notifications (Web Push setup pending server keys).');
          }
        } else {
          toast.success('Native browser notifications enabled for active sessions!');
        }
        return true;
      } else {
        toast.error('Permission for browser notifications was denied.');
        return false;
      }
    } catch (err: any) {
      console.error('Failed to request notification permission:', err);
      toast.error('Failed to request permission: ' + err.message);
      return false;
    }
  }

  async function markAsRead(id: string) {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update notification: ' + err.message);
      if (userId) fetchNotifications(userId);
    }
  }

  async function markAllAsRead() {
    if (!userId) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      toast.success('All notifications marked as read');
    } catch (err: any) {
      toast.error('Failed to mark all as read: ' + err.message);
      fetchNotifications(userId);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    loading,
    unreadCount,
    nativePermission,
    isPushSupported,
    requestNativePermission,
    markAsRead,
    markAllAsRead,
    refreshNotifications: () => userId && fetchNotifications(userId),
  };
}
