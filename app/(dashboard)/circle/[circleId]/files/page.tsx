'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Grid, List, Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileGrid } from '@/components/files/FileGrid';
import { FileUploader } from '@/components/files/FileUploader';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { useFiles } from '@/lib/hooks/useFiles';
import { useCircle } from '@/lib/hooks/useCircle';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { FileRecord } from '@/types';

export default function FilesPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = getSupabaseBrowserClient();

  const {
    files,
    categories,
    loading,
    uploading,
    uploadProgress,
    uploadFile,
    deleteFile,
    togglePin,
    downloadFile,
  } = useFiles(circleId);

  const { userRole } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border border-slate-200"
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Grid/List Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
            <button
              onClick={() => setLayout('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                layout === 'grid'
                  ? 'bg-slate-100 text-slate-800'
                  : 'text-slate-400 hover:text-slate-600'
              )}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                layout === 'list'
                  ? 'bg-slate-100 text-slate-800'
                  : 'text-slate-400 hover:text-slate-600'
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={() => setUploaderOpen(true)} className="gap-1.5 h-10">
            <Plus className="w-4 h-4" />
            <span>Upload File</span>
          </Button>
        </div>
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
            All Files
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

      {/* Files Content */}
      <FileGrid
        files={files}
        loading={loading}
        layout={layout}
        searchQuery={searchQuery}
        selectedCategoryId={selectedCategoryId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onPreview={setPreviewFile}
        onDownload={downloadFile}
        onDelete={deleteFile}
        onTogglePin={togglePin}
        onUploadClick={() => setUploaderOpen(true)}
      />

      {/* Upload Modal */}
      <FileUploader
        open={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onUpload={uploadFile}
        categories={categories}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={downloadFile}
      />
    </div>
  );
}
