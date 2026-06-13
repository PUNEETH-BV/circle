'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NoteList } from '@/components/notes/NoteList';
import { useNotes } from '@/lib/hooks/useNotes';
import { useCircle } from '@/lib/hooks/useCircle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function NotesPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = createClient();

  const {
    notes,
    categories,
    loading,
    createNote,
    deleteNote,
    togglePin,
  } = useNotes(circleId);

  const { userRole } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border border-slate-200"
          />
        </div>
        <Button onClick={createNote} className="gap-1.5 h-10">
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </Button>
      </div>

      {/* Categories Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSelectedCategoryId('')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
              selectedCategoryId === ''
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            )}
          >
            All Notes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                selectedCategoryId === cat.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Note Grid */}
      <NoteList
        notes={notes}
        loading={loading}
        circleId={circleId}
        searchQuery={searchQuery}
        selectedCategoryId={selectedCategoryId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onDelete={deleteNote}
        onTogglePin={togglePin}
        onCreateClick={createNote}
      />
    </div>
  );
}
