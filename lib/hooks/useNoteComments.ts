'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface NoteComment {
  id: string;
  note_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function useNoteComments(noteId: string) {
  const supabase = createClient();
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId) return;
    fetchComments();

    const channel = supabase
      .channel(`note-comments-${noteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'note_comments',
        filter: `note_id=eq.${noteId}`
      }, () => {
        fetchComments();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'note_comments',
        filter: `note_id=eq.${noteId}`
      }, (payload) => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('note_comments')
        .select('*, author:profiles(*)')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as NoteComment[]) || []);
    } catch (err: any) {
      console.error('Error fetching note comments:', err);
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
        .from('note_comments')
        .insert({
          note_id: noteId,
          author_id: user.id,
          body: body.trim()
        });

      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to post comment: ' + err.message);
      throw err;
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const { error } = await supabase
        .from('note_comments')
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
