'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { JoinRequest } from '@/types';
import { toast } from 'sonner';

export function useJoinRequests(circleId: string) {
  const supabase = createClient();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();

    // Realtime subscription for join requests
    const channel = supabase
      .channel(`circle-join-requests-${circleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'join_requests',
        filter: `circle_id=eq.${circleId}`,
      }, async (payload) => {
        // Fetch new request's profile since payload.new doesn't contain the joined profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.user_id)
          .single();

        const newRequest = {
          ...payload.new,
          profile
        } as JoinRequest;

        setRequests(prev => {
          // Prevent duplicates
          if (prev.some(r => r.id === newRequest.id)) return prev;
          return [newRequest, ...prev];
        });
        toast('New join request received');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'join_requests',
        filter: `circle_id=eq.${circleId}`,
      }, (payload) => {
        setRequests(prev =>
          prev.map(r => (r.id === payload.new.id ? { ...r, status: payload.new.status } : r))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*, profile:profiles(*)')
        .eq('circle_id', circleId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data as JoinRequest[] || []);
    } catch (err: any) {
      toast.error('Failed to load join requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(requestId: string, requestUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      setRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, status: 'approved' } : r))
      );

      // 1. Update join_request status
      const { error: requestError } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // 2. Insert into circle_members
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: requestUserId,
          role: 'member'
        });

      if (memberError) throw memberError;

      const approvedReq = requests.find(r => r.id === requestId);
      toast.success(`Approved! ${approvedReq?.profile?.full_name || 'User'} is now a member`);
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
      // Revert optimistic update
      fetchRequests();
    }
  }

  async function rejectRequest(requestId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      setRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );

      const { error } = await supabase
        .from('join_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Join request rejected');
    } catch (err: any) {
      toast.error('Rejection failed: ' + err.message);
      // Revert optimistic update
      fetchRequests();
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return {
    requests,
    pendingCount,
    loading,
    approveRequest,
    rejectRequest,
    refreshRequests: fetchRequests
  };
}
