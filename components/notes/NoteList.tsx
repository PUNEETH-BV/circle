'use client';

import { NoteCard } from './NoteCard';
import { SkeletonGrid } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText, Search } from 'lucide-react';
import type { Note } from '@/types';

interface NoteListProps {
  notes: Note[];
  loading: boolean;
  circleId: string;
  searchQuery: string;
  selectedCategoryId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (noteId: string) => Promise<void>;
  onTogglePin: (note: Note) => Promise<void>;
  onCreateClick: () => void;
}

export function NoteList({
  notes,
  loading,
  circleId,
  searchQuery,
  selectedCategoryId,
  currentUserId,
  isAdmin,
  onDelete,
  onTogglePin,
  onCreateClick,
}: NoteListProps) {
  if (loading) {
    return <SkeletonGrid count={6} />;
  }

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(note.content).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId ? note.category_id === selectedCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  if (filteredNotes.length === 0) {
    if (searchQuery || selectedCategoryId) {
      return (
        <EmptyState
          icon={Search}
          title="No search results"
          description="We couldn't find any notes matching your search or filters. Try adjusting your query."
        />
      );
    }
    return (
      <EmptyState
        icon={FileText}
        title="No notes yet"
        description="Write documentation, brainstorm ideas, or keep logs together with your team."
        actionLabel="Create First Note"
        onAction={onCreateClick}
      />
    );
  }

  // Split pinned and unpinned notes (hide split if filter/search is active)
  const isFiltering = !!searchQuery || !!selectedCategoryId;
  const pinnedNotes = isFiltering ? [] : filteredNotes.filter((n) => n.pinned);
  const otherNotes = isFiltering ? filteredNotes : filteredNotes.filter((n) => !n.pinned);

  const renderNotesGrid = (notesToRender: Note[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {notesToRender.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          circleId={circleId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
            Pinned Notes
          </h3>
          {renderNotesGrid(pinnedNotes)}
        </div>
      )}

      {/* Main Notes Section */}
      {otherNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
              All Notes
            </h3>
          )}
          {renderNotesGrid(otherNotes)}
        </div>
      )}
    </div>
  );
}
