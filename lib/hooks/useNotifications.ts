'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/types';
import { toast } from 'sonner';

export function useNotifications() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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
    markAsRead,
    markAllAsRead,
    refreshNotifications: () => userId && fetchNotifications(userId),
  };
}
