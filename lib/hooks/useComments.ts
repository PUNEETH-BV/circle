'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  announcement_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function useComments(announcementId: string) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime comments insertions & deletions
    const channel = supabase
      .channel(`announcement-comments-${announcementId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcement_comments',
        filter: `announcement_id=eq.${announcementId}`
      }, () => {
        // Re-fetch to get author details joined properly
        fetchComments();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'announcement_comments',
        filter: `announcement_id=eq.${announcementId}`
      }, (payload) => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [announcementId]);

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('announcement_comments')
        .select('*, author:profiles(*)')
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as Comment[]) || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addComment(body: string) {
    if (!body.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: announcementId,
          author_id: user.id,
          body: body.trim()
        });

      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to add comment: ' + err.message);
      throw err;
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comment deleted');
    } catch (err: any) {
      toast.error('Failed to delete comment: ' + err.message);
    }
  }

  return { comments, loading, addComment, deleteComment, refreshComments: fetchComments };
}
