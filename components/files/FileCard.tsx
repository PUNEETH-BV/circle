'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getFileIcon } from '@/lib/utils/getFileIcon';
import { formatFileSize } from '@/lib/utils/formatFileSize';
import { formatDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils';
import type { FileRecord } from '@/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

interface FileCardProps {
  file: FileRecord;
  layout: 'grid' | 'list';
  currentUserId?: string;
  isAdmin: boolean;
  onPreview: (file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onTogglePin: (file: FileRecord) => void;
}

export function FileCard({
  file,
  layout,
  currentUserId,
  isAdmin,
  onPreview,
  onDownload,
  onDelete,
  onTogglePin,
}: FileCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canDelete = isAdmin || file.uploaded_by === currentUserId;
  const canPin = isAdmin;

  // Dynamically resolve icon from the lucide-react library
  const iconName = getFileIcon(file.file_type);
  const IconComponent = (Icons as any)[iconName] || Icons.File;

  const handleConfirmDelete = () => {
    onDelete(file);
    setShowDeleteConfirm(false);
  };

  if (layout === 'list') {
    return (
      <div className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors bg-white group">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50/50 transition-colors">
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                onClick={() => onPreview(file)}
                className="text-sm font-semibold text-slate-800 hover:text-indigo-600 cursor-pointer truncate max-w-[200px] sm:max-w-[400px]"
                title={file.name}
              >
                {file.name}
              </span>
              {file.pinned && (
                <Icons.Pin className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500">
              {file.category && (
                <Badge variant="outline" className="px-1.5 py-0">
                  {file.category.name}
                </Badge>
              )}
              <span>Uploaded by {file.uploader?.full_name || 'unknown'}</span>
              <span>{formatDate(file.created_at)}</span>
              <span>{formatFileSize(file.file_size)}</span>
              <span>{file.download_count} download{file.download_count !== 1 && 's'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => {
              const url = `${window.location.origin}/circle/${file.circle_id}/files/${file.folder_id || ''}?fileId=${file.id}`;
              navigator.clipboard.writeText(url);
              toast.success('File link copied to clipboard!');
            }}
            title="Copy Link"
          >
            <Icons.Link2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => onPreview(file)}
            title="Preview"
          >
            <Icons.Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => onDownload(file)}
            title="Download"
          >
            <Icons.Download className="w-4 h-4" />
          </Button>
          {canPin && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-8 h-8 hover:bg-indigo-50',
                file.pinned ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
              )}
              onClick={() => onTogglePin(file)}
              title={file.pinned ? 'Unpin' : 'Pin'}
            >
              <Icons.Pin className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 hover:text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete"
            >
              <Icons.Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Delete File"
          description={`Are you sure you want to delete "${file.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between group h-[220px]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          {/* File icon & type wrapper */}
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50/50 transition-colors">
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1">
            {file.pinned && (
              <div className="w-8 h-8 flex items-center justify-center text-indigo-500">
                <Icons.Pin className="w-4 h-4 fill-indigo-500" />
              </div>
            )}
            
            {/* Action buttons (always visible on hover or focus) */}
            <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={() => {
                  const url = `${window.location.origin}/circle/${file.circle_id}/files/${file.folder_id || ''}?fileId=${file.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('File link copied to clipboard!');
                }}
                title="Copy Link"
              >
                <Icons.Link2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={() => onPreview(file)}
                title="Preview"
              >
                <Icons.Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={() => onDownload(file)}
                title="Download"
              >
                <Icons.Download className="w-3.5 h-3.5" />
              </Button>
              {canPin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'w-7 h-7 hover:bg-indigo-50',
                    file.pinned ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
                  )}
                  onClick={() => onTogglePin(file)}
                  title={file.pinned ? 'Unpin' : 'Pin'}
                >
                  <Icons.Pin className="w-3.5 h-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete"
                >
                  <Icons.Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h4
            onClick={() => onPreview(file)}
            className="text-sm font-semibold text-slate-900 truncate hover:text-indigo-600 cursor-pointer block"
            title={file.name}
          >
            {file.name}
          </h4>
          {file.description && (
            <p className="text-xs text-slate-500 line-clamp-2 h-8 leading-relaxed">
              {file.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">By {file.uploader?.full_name || 'unknown'}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {file.category && (
            <Badge variant="outline" className="px-1.5 py-0 border-slate-100 max-w-[80px] truncate">
              {file.category.name}
            </Badge>
          )}
          <span>{formatFileSize(file.file_size)}</span>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${file.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
