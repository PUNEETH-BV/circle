'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pin, Trash2, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/formatDate';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { Note } from '@/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: Note;
  circleId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (noteId: string) => Promise<void>;
  onTogglePin: (note: Note) => Promise<void>;
}

// Extract plain text snippet from Tiptap JSON structure
function getNoteSnippet(content: any): string {
  if (!content) return 'No content';
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return extractText(parsed);
    } catch {
      return content;
    }
  }
  return extractText(content);
}

function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).join(' ');
  }
  return '';
}

export function NoteCard({
  note,
  circleId,
  currentUserId,
  isAdmin,
  onDelete,
  onTogglePin,
}: NoteCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canDelete = isAdmin || note.author_id === currentUserId;
  const canPin = isAdmin;

  const snippet = getNoteSnippet(note.content).slice(0, 140).trim();
  const displaySnippet = snippet ? `${snippet}...` : 'Empty note';

  const handleConfirmDelete = async () => {
    await onDelete(note.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between group h-[200px]">
      <div className="space-y-2.5 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-indigo-50 border border-slate-100 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <Link
              href={`/circle/${circleId}/notes/${note.id}`}
              className="text-sm font-semibold text-slate-900 hover:text-indigo-600 truncate transition-colors cursor-pointer"
              title={note.title}
            >
              {note.title || 'Untitled Note'}
            </Link>
          </div>

          <div className="flex items-center gap-0.5">
            {note.pinned && (
              <div className="w-7 h-7 flex items-center justify-center text-indigo-500 flex-shrink-0">
                <Pin className="w-4 h-4 fill-indigo-500" />
              </div>
            )}

            {/* Hover Actions */}
            <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5">
              {canPin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'w-7 h-7 hover:bg-indigo-50',
                    note.pinned ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note);
                  }}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Snippet */}
        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed h-[3.75rem]">
          {displaySnippet}
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            name={note.author?.full_name || 'User'}
            avatarUrl={note.author?.avatar_url}
            size="sm"
            className="w-5 h-5 text-[10px]"
          />
          <span className="truncate">{note.author?.full_name || 'unknown'}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {note.category && (
            <Badge variant="outline" className="px-1.5 py-0 border-slate-100 max-w-[80px] truncate">
              {note.category.name}
            </Badge>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(note.updated_at)}
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Note"
        description={`Are you sure you want to delete "${note.title || 'Untitled Note'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
