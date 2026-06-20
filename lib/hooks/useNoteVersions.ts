'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface NoteVersion {
  id: string;
  note_id: string;
  updated_by: string;
  title: string;
  content: any;
  created_at: string;
  author?: {
    full_name: string;
  };
}

export function useNoteVersions(noteId: string) {
  const supabase = createClient();
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId) return;
    fetchVersions();
  }, [noteId]);

  async function fetchVersions() {
    try {
      const { data, error } = await supabase
        .from('note_versions')
        .select('*, author:profiles(*)')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersions((data as NoteVersion[]) || []);
    } catch (err: any) {
      console.error('Error fetching note revisions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveVersion(title: string, content: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('note_versions')
        .insert({
          note_id: noteId,
          updated_by: user.id,
          title: title.trim(),
          content: content
        });

      if (error) throw error;
      fetchVersions(); // Reload revisions
    } catch (err: any) {
      console.error('Failed to create version snapshot:', err);
    }
  }

  return { versions, loading, saveVersion, refreshVersions: fetchVersions };
}
