'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Circle, Announcement, CircleMember } from '@/types';

export function useCircle(circleId: string) {
  const supabase = getSupabaseBrowserClient();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');

  useEffect(() => {
    fetchCircle();
    fetchAnnouncements();
    checkRole();

    // Realtime subscription for announcements
    const channel = supabase
      .channel(`circle-announcements-${circleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: `circle_id=eq.${circleId}`,
      }, (payload) => {
        setAnnouncements(prev => [payload.new as Announcement, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchCircle() {
    const { data } = await supabase
      .from('circles')
      .select('*')
      .eq('id', circleId)
      .single();
    setCircle(data);
    setLoading(false);
  }

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*, author:profiles(*)')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  }

  async function checkRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .single();
    if (data) setUserRole(data.role as 'admin' | 'member');
  }

  async function createAnnouncement(title: string, body: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('announcements')
      .insert({
        circle_id: circleId,
        author_id: user.id,
        title,
        body,
      });
    if (error) throw error;
  }

  return { circle, announcements, loading, userRole, createAnnouncement, refreshCircle: fetchCircle };
}
