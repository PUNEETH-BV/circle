'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useNotes } from '@/lib/hooks/useNotes';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Note } from '@/types';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.circleId as string;
  const noteId = params.noteId as string;
  const supabase = createClient();

  const { updateNote } = useNotes(circleId);
  const [note, setNote] = useState<Note | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNoteAndProfile() {
      try {
        const [noteRes, userRes] = await Promise.all([
          supabase.from('notes').select('*').eq('id', noteId).single(),
          supabase.auth.getUser()
        ]);

        if (noteRes.error) throw noteRes.error;
        if (!noteRes.data) throw new Error('Note not found');

        setNote(noteRes.data as Note);

        if (userRes.data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userRes.data.user.id)
            .single();
          setCurrentUserProfile(profile);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load note');
      } finally {
        setLoading(false);
      }
    }

    loadNoteAndProfile();
  }, [noteId]);

  const handleSave = async (title: string, content: any) => {
    await updateNote(noteId, { title, content });
  };

  const handleBack = () => {
    router.push(`/circle/${circleId}/notes`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-slate-500 bg-white border border-slate-100 rounded-xl p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading editor...</span>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white border border-slate-100 rounded-xl max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h4 className="text-lg font-semibold text-slate-900 mb-1">Editor Error</h4>
        <p className="text-sm text-slate-500 mb-6">{error || 'Could not load note details'}</p>
        <Button onClick={handleBack}>Go Back to Notes</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)]">
      <NoteEditor
        initialTitle={note.title}
        initialContent={note.content}
        onSave={handleSave}
        onBack={handleBack}
        currentUserProfile={currentUserProfile}
      />
    </div>
  );
}
