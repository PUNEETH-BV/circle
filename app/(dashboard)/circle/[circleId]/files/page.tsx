'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, FolderPlus, Users, FolderOpen, ArrowUpDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FolderCard } from '@/components/files/FolderCard';
import { CreateFolderModal } from '@/components/files/CreateFolderModal';
import { useFolders } from '@/lib/hooks/useFolders';
import { useCircle } from '@/lib/hooks/useCircle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Folder, Profile } from '@/types';
import { SkeletonGrid } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { getInitials } from '@/lib/utils/getInitials';

type SortOption = 'newest' | 'oldest' | 'az' | 'most_files';

export default function FilesPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = createClient();

  const {
    folders,
    categories,
    loading,
    createFolder,
    deleteFolder,
    pinFolder,
    uploadToFolder,
    updateFolder
  } = useFolders(circleId);

  const { userRole } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedUploaderId, setSelectedUploaderId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  // Extract unique uploaders/creators from folders list
  const creatorsMap = new Map<string, Profile>();
  folders.forEach((f) => {
    if (f.created_by && f.creator) {
      creatorsMap.set(f.created_by, f.creator);
    }
  });
  const creators = Array.from(creatorsMap.values());

  // Filter folders
  const filteredFolders = folders.filter((folder) => {
    const matchesSearch = folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (folder.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesCategory = selectedCategoryId ? folder.category_id === selectedCategoryId : true;
    const matchesUploader = selectedUploaderId ? folder.created_by === selectedUploaderId : true;

    return matchesSearch && matchesCategory && matchesUploader;
  });

  // Sort folders
  const sortedFolders = [...filteredFolders].sort((a, b) => {
    // Keep pinned folders at the top first if no uploader/category/search filter is active
    const isFiltering = !!searchQuery || !!selectedCategoryId || !!selectedUploaderId;
    if (!isFiltering) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
    }

    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'az':
        return a.name.localeCompare(b.name);
      case 'most_files':
        return b.file_count - a.file_count;
      case 'newest':
      default:
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    }
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Filter - Desktop only */}
      <aside className="hidden lg:block w-64 flex-shrink-0 space-y-6">
        {/* Uploaders Filter */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Creators</span>
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedUploaderId(null)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                selectedUploaderId === null
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                ALL
              </div>
              <span>All Creators</span>
            </button>

            {creators.map((creator) => {
              const isSelected = selectedUploaderId === creator.id;
              return (
                <button
                  key={creator.id}
                  onClick={() => setSelectedUploaderId(creator.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left min-w-0',
                    isSelected
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.full_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-[9px]">
                      {getInitials(creator.full_name)}
                    </div>
                  )}
                  <span className="truncate">{creator.full_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Filter */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Categories</span>
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left block',
                  selectedCategoryId === null
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                All Categories
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left block truncate',
                      isSelected
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-5">
        {/* Mobile Filter Pill Rows */}
        <div className="lg:hidden space-y-3">
          {/* Uploader mobile list */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            <button
              onClick={() => setSelectedUploaderId(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5',
                selectedUploaderId === null
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              All Creators
            </button>
            {creators.map((creator) => {
              const isSelected = selectedUploaderId === creator.id;
              return (
                <button
                  key={creator.id}
                  onClick={() => setSelectedUploaderId(creator.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5',
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600'
                  )}
                >
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.full_name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[8px]">
                      {getInitials(creator.full_name)}
                    </div>
                  )}
                  <span>{creator.full_name}</span>
                </button>
              );
            })}
          </div>

          {/* Categories mobile list */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                  selectedCategoryId === null
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600'
                )}
              >
                All Categories
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600'
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border border-slate-200"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative flex items-center border border-slate-200 rounded-lg bg-white px-3 h-10 select-none">
              <ArrowUpDown className="w-4 h-4 text-slate-400 mr-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="az">A-Z</option>
                <option value="most_files">Most Files</option>
              </select>
            </div>

            <Button onClick={() => setCreateModalOpen(true)} className="gap-1.5 h-10 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700">
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </Button>
          </div>
        </div>

        {/* Active filters badges summary */}
        {(selectedCategoryId || selectedUploaderId || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Active Filters:</span>
            {selectedUploaderId && (
              <Badge variant="secondary" className="gap-1 pr-1 bg-indigo-50 border-indigo-100 text-indigo-600">
                <span>Creator: {creators.find(c => c.id === selectedUploaderId)?.full_name}</span>
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedUploaderId(null)} />
              </Badge>
            )}
            {selectedCategoryId && (
              <Badge variant="secondary" className="gap-1 pr-1 bg-indigo-50 border-indigo-100 text-indigo-600">
                <span>Category: {categories.find(c => c.id === selectedCategoryId)?.name}</span>
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedCategoryId(null)} />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 pr-1 bg-indigo-50 border-indigo-100 text-indigo-600">
                <span>Search: "{searchQuery}"</span>
                <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            <button
              onClick={() => {
                setSelectedCategoryId(null);
                setSelectedUploaderId(null);
                setSearchQuery('');
              }}
              className="text-indigo-600 hover:underline font-semibold ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Folders Grid content */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : sortedFolders.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={searchQuery || selectedCategoryId || selectedUploaderId ? 'No matching folders' : 'No folders yet'}
            description={
              searchQuery || selectedCategoryId || selectedUploaderId
                ? 'Try clearing filters or adjusting your search keyword.'
                : 'Create folders to organize your circle workspace files, spreadsheets, docs, and assets.'
            }
            actionLabel={searchQuery || selectedCategoryId || selectedUploaderId ? undefined : 'Create First Folder'}
            onAction={searchQuery || selectedCategoryId || selectedUploaderId ? undefined : () => setCreateModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                circleId={circleId}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDelete={deleteFolder}
                onPin={pinFolder}
                onUpdate={updateFolder}
                categories={categories}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateFolder={createFolder}
        onUploadToFolder={uploadToFolder}
        categories={categories}
      />
    </div>
  );
}
