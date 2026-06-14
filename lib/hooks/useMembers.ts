'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CircleMember } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function useMembers(circleId: string) {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();

    // Realtime subscription for circle members
    const channel = supabase
      .channel(`circle-members-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_members',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from('circle_members')
        .select('*, profile:profiles(*)')
        .eq('circle_id', circleId);

      if (error) throw error;
      setMembers(data as CircleMember[] || []);
    } catch (err: any) {
      toast.error('Failed to load members: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateMemberRole(memberId: string, newRole: 'admin' | 'member') {
    try {
      const { error } = await supabase
        .from('circle_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(`Updated role to ${newRole}`);
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      toast.error('Failed to update role: ' + err.message);
    }
  }

  async function removeMember(memberId: string) {
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Removed member from circle');
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err: any) {
      toast.error('Failed to remove member: ' + err.message);
    }
  }

  async function leaveCircle() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('You have left the circle');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to leave circle: ' + err.message);
    }
  }

  return {
    members,
    loading,
    updateMemberRole,
    removeMember,
    leaveCircle,
    refreshMembers: fetchMembers,
  };
}
