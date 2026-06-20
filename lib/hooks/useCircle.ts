'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Circle, Announcement, CircleMember } from '@/types';

export function useCircle(circleId: string) {
  const supabase = createClient();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [canUpload, setCanUpload] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Recent activity logs state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    initUser();
    
    fetchCircle();
    fetchAnnouncements();
    checkRole();
    fetchRecentActivity();

    // Realtime subscription for announcements changes (Insert and Update)
    const channel = supabase
      .channel(`circle-announcements-realtime-${circleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        // Re-fetch to get author profile joined properly
        fetchAnnouncements();
        fetchRecentActivity();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'announcements',
        filter: `circle_id=eq.${circleId}`,
      }, (payload) => {
        const updated = payload.new as Announcement;
        setAnnouncements(prev => 
          prev.map(a => a.id === updated.id ? { 
            ...a, 
            reactions: updated.reactions,
            poll_question: updated.poll_question,
            poll_options: updated.poll_options
          } : a)
        );
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
      .select('role, can_upload')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .single();
    if (data) {
      setUserRole(data.role as 'admin' | 'member');
      setCanUpload(data.can_upload !== false);
    }
  }

  async function fetchRecentActivity() {
    try {
      const [filesRes, notesRes] = await Promise.all([
        supabase
          .from('files')
          .select('id, name, created_at, file_type')
          .eq('circle_id', circleId)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('notes')
          .select('id, title, updated_at')
          .eq('circle_id', circleId)
          .order('updated_at', { ascending: false })
          .limit(4)
      ]);

      const combined = [
        ...(filesRes.data || []).map(f => ({
          id: f.id,
          type: 'file',
          title: f.name,
          time: new Date(f.created_at),
          meta: f.file_type
        })),
        ...(notesRes.data || []).map(n => ({
          id: n.id,
          type: 'note',
          title: n.title || 'Untitled Note',
          time: new Date(n.updated_at),
          meta: null
        }))
      ];

      // Sort by time descending
      combined.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(combined.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch circle activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  }

  async function createAnnouncement(
    title: string, 
    body: string, 
    media?: { url: string; type: 'image' | 'video' }[],
    pollQuestion?: string,
    pollOptions?: { id: string; text: string; votes: string[] }[]
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('announcements')
      .insert({
        circle_id: circleId,
        author_id: user.id,
        title,
        body,
        media: media || [],
        poll_question: pollQuestion || null,
        poll_options: pollOptions || []
      });
    if (error) throw error;
  }

  // Toggle emoji reactions on announcements
  async function toggleReaction(announcementId: string, emoji: string) {
    if (!currentUserId) return;

    // Find the announcement in current state
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const currentReactions = { ...(announcement.reactions || {}) };
    const usersList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
    
    let updatedUsersList: string[];
    if (usersList.includes(currentUserId)) {
      // User already reacted with this emoji: remove them
      updatedUsersList = usersList.filter(uid => uid !== currentUserId);
    } else {
      // User has not reacted: add them
      updatedUsersList = [...usersList, currentUserId];
    }

    if (updatedUsersList.length > 0) {
      currentReactions[emoji] = updatedUsersList;
    } else {
      delete currentReactions[emoji];
    }

    // Optimistic Update
    setAnnouncements(prev => 
      prev.map(a => a.id === announcementId ? { ...a, reactions: currentReactions } : a)
    );

    // Save to Database
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ reactions: currentReactions })
        .eq('id', announcementId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to toggle reaction in database:', err);
      // Re-fetch in case of failure to sync correctly
      fetchAnnouncements();
    }
  }

  async function voteInPoll(announcementId: string, optionId: string) {
    if (!currentUserId) return;

    // Optimistic Update
    setAnnouncements(prev => 
      prev.map(a => {
        if (a.id === announcementId && a.poll_options) {
          const updatedOptions = a.poll_options.map(opt => {
            let votes = [...(opt.votes || [])];
            const userAlreadyVoted = votes.includes(currentUserId);
            if (opt.id === optionId) {
              if (userAlreadyVoted) {
                votes = votes.filter(uid => uid !== currentUserId);
              } else {
                votes.push(currentUserId);
              }
            } else {
              votes = votes.filter(uid => uid !== currentUserId);
            }
            return { ...opt, votes };
          });
          return { ...a, poll_options: updatedOptions };
        }
        return a;
      })
    );

    try {
      // Fetch latest options from DB
      const { data, error: fetchErr } = await supabase
        .from('announcements')
        .select('poll_options')
        .eq('id', announcementId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentOptions: any[] = data.poll_options || [];
      const updatedOptions = currentOptions.map(opt => {
        let votes = [...(opt.votes || [])];
        if (opt.id === optionId) {
          if (votes.includes(currentUserId)) {
            votes = votes.filter(uid => uid !== currentUserId);
          } else {
            votes.push(currentUserId);
          }
        } else {
          votes = votes.filter(uid => uid !== currentUserId);
        }
        return { ...opt, votes };
      });

      const { error: updateErr } = await supabase
        .from('announcements')
        .update({ poll_options: updatedOptions })
        .eq('id', announcementId);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      console.error('Failed to vote in poll:', err);
      fetchAnnouncements();
    }
  }

  return { 
    circle, 
    announcements, 
    loading, 
    userRole, 
    canUpload, 
    activities,
    loadingActivities,
    currentUserId,
    createAnnouncement, 
    toggleReaction,
    voteInPoll,
    refreshCircle: fetchCircle,
    refreshActivity: fetchRecentActivity
  };
}
