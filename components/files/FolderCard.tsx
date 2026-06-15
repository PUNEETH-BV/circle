'use client';

import { useState } from 'react';
import { Folder as FolderIcon, MoreVertical, Trash2, Edit2, Pin, ArrowRight, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/formatDate';
import type { Folder, Category } from '@/types';
import Link from 'next/link';
import { toast } from 'sonner';

interface FolderCardProps {
  folder: Folder;
  circleId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (folderId: string) => Promise<void>;
  onPin: (folderId: string, pinned: boolean) => Promise<void>;
  onUpdate: (folderId: string, name: string, description?: string, categoryId?: string) => Promise<void>;
  categories: Category[];
}

export function FolderCard({
  folder,
  circleId,
  currentUserId,
  isAdmin,
  onDelete,
  onPin,
  onUpdate,
  categories
}: FolderCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [editDesc, setEditDesc] = useState(folder.description || '');
  const [editCategory, setEditCategory] = useState(folder.category_id || '');
  const [saving, setSaving] = useState(false);

  const canManage = isAdmin || folder.created_by === currentUserId;

  const handleConfirmDelete = async () => {
    try {
      await onDelete(folder.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await onUpdate(folder.id, editName.trim(), editDesc.trim(), editCategory || undefined);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h4 className="text-sm font-semibold text-slate-800">Edit Folder</h4>
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <div>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-8 text-xs font-semibold px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Folder Name"
              required
            />
          </div>
          <div>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-12"
              placeholder="Description (Optional)"
            />
          </div>
          <div>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full h-8 text-xs px-2 border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="h-7 px-2 text-[10px]"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="h-7 px-2 text-[10px]">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Find category name if category exists
  const category = categories.find(c => c.id === folder.category_id);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between group h-[220px] relative">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-[#4F46E5] flex-shrink-0">
              <FolderIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 max-w-[180px] sm:max-w-[220px]">
                <Link
                  href={`/circle/${circleId}/files/${folder.id}`}
                  className="text-sm font-semibold text-slate-800 hover:text-indigo-600 truncate block cursor-pointer"
                  title={folder.name}
                >
                  {folder.name}
                </Link>
                {folder.pinned && (
                  <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500 flex-shrink-0" />
                )}
              </div>
              {category && (
                <Badge variant="outline" className="mt-0.5 px-1 text-[9px] py-0 text-slate-400 border-slate-100">
                  {category.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Action options */}
          <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
              onClick={() => {
                const url = `${window.location.origin}/circle/${circleId}/files/${folder.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Folder link copied to clipboard!');
              }}
              title="Copy Link"
            >
              <Link2 className="w-3.5 h-3.5" />
            </Button>

            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
                  onClick={() => onPin(folder.id, !folder.pinned)}
                  title={folder.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setIsEditing(true)}
                  title="Edit Folder"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete Folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 h-8 leading-relaxed">
          {folder.description || 'No description provided.'}
        </p>
      </div>

      <div className="border-t border-slate-50 pt-3 flex items-center justify-between mt-auto">
        {/* Creator avatar + name */}
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            name={folder.creator?.full_name || 'User'}
            avatarUrl={folder.creator?.avatar_url}
            size="sm"
            className="w-6 h-6 text-[10px]"
          />
          <span className="text-[11px] text-slate-500 truncate font-medium">
            {folder.creator?.full_name || 'unknown'}
          </span>
        </div>

        {/* File count + date */}
        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-shrink-0 font-medium">
          <span>{folder.file_count} file{folder.file_count !== 1 && 's'}</span>
          <span>•</span>
          <span>{formatDate(folder.updated_at || folder.created_at)}</span>
        </div>
      </div>

      {/* Hover visual cue to open folder */}
      <div className="absolute right-4 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center pointer-events-none">
        <Link
          href={`/circle/${circleId}/files/${folder.id}`}
          className="text-xs text-indigo-600 flex items-center gap-0.5 font-semibold pointer-events-auto"
        >
          <span>Open Folder</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Folder"
        description={`Are you sure you want to delete "${folder.name}" and all of its files? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
