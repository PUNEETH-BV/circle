'use client';

import { FileCard } from './FileCard';
import { SkeletonGrid, SkeletonRow } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { File, Search } from 'lucide-react';
import type { FileRecord } from '@/types';

interface FileGridProps {
  files: FileRecord[];
  loading: boolean;
  layout: 'grid' | 'list';
  searchQuery: string;
  selectedCategoryId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onPreview: (file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onTogglePin: (file: FileRecord) => void;
  onUploadClick: () => void;
}

export function FileGrid({
  files,
  loading,
  layout,
  searchQuery,
  selectedCategoryId,
  currentUserId,
  isAdmin,
  onPreview,
  onDownload,
  onDelete,
  onTogglePin,
  onUploadClick,
}: FileGridProps) {
  if (loading) {
    if (layout === 'list') {
      return (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      );
    }
    return <SkeletonGrid count={6} />;
  }

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId ? file.category_id === selectedCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  // If no files match filters, show empty state
  if (filteredFiles.length === 0) {
    if (searchQuery || selectedCategoryId) {
      return (
        <EmptyState
          icon={Search}
          title="No search results"
          description="We couldn't find any files matching your search or filters. Try adjusting your query."
        />
      );
    }
    return (
      <EmptyState
        icon={File}
        title="No files yet"
        description="Share docs, PDFs, images, and other assets with your circle members."
        actionLabel="Upload First File"
        onAction={onUploadClick}
      />
    );
  }

  // Partition pinned and unpinned files (only show pinned section if there is no category/search filter active)
  const isFiltering = !!searchQuery || !!selectedCategoryId;
  const pinnedFiles = isFiltering ? [] : filteredFiles.filter((f) => f.pinned);
  const otherFiles = isFiltering ? filteredFiles : filteredFiles.filter((f) => !f.pinned);

  const renderFilesList = (filesToRender: FileRecord[]) => {
    if (layout === 'list') {
      return (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100 shadow-sm">
          {filesToRender.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              layout="list"
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onPreview={onPreview}
              onDownload={onDownload}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filesToRender.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            layout="grid"
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onPreview={onPreview}
            onDownload={onDownload}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pinned Files Section */}
      {pinnedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
            Pinned Files
          </h3>
          {renderFilesList(pinnedFiles)}
        </div>
      )}

      {/* Main Files Section */}
      {otherFiles.length > 0 && (
        <div className="space-y-3">
          {pinnedFiles.length > 0 && (
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
              All Files
            </h3>
          )}
          {renderFilesList(otherFiles)}
        </div>
      )}
    </div>
  );
}
