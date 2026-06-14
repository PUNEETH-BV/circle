'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Note, Category } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function useNotes(circleId: string) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
    fetchCategories();

    // Realtime subscription for notes
    const channel = supabase
      .channel(`circle-notes-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        // Refetch to populate author/category relationship fields
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchNotes() {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*, author:profiles(*), category:categories(*)')
        .eq('circle_id', circleId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err: any) {
      toast.error('Failed to load notes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('circle_id', circleId)
        .order('position', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  }

  async function createNote() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notes')
        .insert({
          circle_id: circleId,
          author_id: user.id,
          title: 'Untitled Note',
          content: { type: 'doc', content: [] }, // Tiptap JSON format
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Created new note');
      router.push(`/circle/${circleId}/notes/${data.id}`);
      return data as Note;
    } catch (err: any) {
      toast.error('Failed to create note: ' + err.message);
      return null;
    }
  }

  async function updateNote(noteId: string, updates: { title?: string; content?: any; category_id?: string | null }) {
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (error) throw error;

      // Update local state directly to prevent laggy UI
      setNotes(prev =>
        prev.map(n => (n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
      );
    } catch (err: any) {
      toast.error('Failed to save note: ' + err.message);
      throw err;
    }
  }

  async function deleteNote(noteId: string) {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Deleted note');
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      toast.error('Failed to delete note: ' + err.message);
    }
  }

  async function togglePin(note: Note) {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ pinned: !note.pinned })
        .eq('id', note.id);

      if (error) throw error;
      toast.success(note.pinned ? 'Unpinned note' : 'Pinned note');
      setNotes(prev =>
        prev.map(n => (n.id === note.id ? { ...n, pinned: !note.pinned } : n))
      );
    } catch (err: any) {
      toast.error('Failed to toggle pin: ' + err.message);
    }
  }

  return {
    notes,
    categories,
    loading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    refreshNotes: fetchNotes,
  };
}
