'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Download, Trash2, Eye, Calendar, HardDrive, User, Loader2, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileGrid } from '@/components/files/FileGrid';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { AddFilesModal } from '@/components/files/AddFilesModal';
import { useFiles } from '@/lib/hooks/useFiles';
import { useFolders } from '@/lib/hooks/useFolders';
import { useCircle } from '@/lib/hooks/useCircle';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';
import type { Folder, FileRecord } from '@/types';
import Link from 'next/link';

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.circleId as string;
  const folderId = params.folderId as string;
  const supabase = createClient();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [loadingFolder, setLoadingFolder] = useState(true);
  const [addFilesOpen, setAddFilesOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const {
    files,
    loading: loadingFiles,
    deleteFile,
    togglePin,
    downloadFile
  } = useFiles(circleId, folderId);

  const { uploadToFolder } = useFolders(circleId);
  const { userRole } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchFolderDetails();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, [circleId, folderId]);

  async function fetchFolderDetails() {
    setLoadingFolder(true);
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*, creator:profiles(*)')
        .eq('id', folderId)
        .single();

      if (error) throw error;
      setFolder(data as Folder);
    } catch (err) {
      console.error(err);
      router.push(`/circle/${circleId}/files`);
    } finally {
      setLoadingFolder(false);
    }
  }

  if (loadingFolder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-slate-500 bg-white border border-slate-100 rounded-xl p-8 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading folder...</span>
      </div>
    );
  }

  if (!folder) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href={`/circle/${circleId}/files`} className="hover:text-indigo-600 transition-colors">
          Files
        </Link>
        <span>/</span>
        <span className="text-slate-800">{folder.name}</span>
      </div>

      {/* Folder Header Banner */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{folder.name}</h2>
            {folder.pinned && (
              <Badge className="bg-indigo-50 border-indigo-100 text-indigo-600">Pinned</Badge>
            )}
          </div>
          {folder.description && (
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {folder.description}
            </p>
          )}

          {/* Metadata info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>Created by {folder.creator?.full_name || 'unknown'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last updated {formatDate(folder.updated_at || folder.created_at)}</span>
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{files.length} file{files.length !== 1 && 's'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <Link href={`/circle/${circleId}/files`}>
            <Button variant="outline" className="gap-1.5 h-10">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Folders</span>
            </Button>
          </Link>
          <Button onClick={() => setAddFilesOpen(true)} className="gap-1.5 h-10 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            <span>Add Files</span>
          </Button>
        </div>
      </div>

      {/* Files List/Grid inside the folder */}
      {files.length === 0 && !loadingFiles ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
            <File className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-slate-800">This folder is empty</h4>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Add files, docs, or PDFs to start organizing them inside this folder.
            </p>
          </div>
          <Button onClick={() => setAddFilesOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            Add First File
          </Button>
        </div>
      ) : (
        <FileGrid
          files={files}
          loading={loadingFiles}
          layout="grid"
          searchQuery=""
          selectedCategoryId=""
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onPreview={setPreviewFile}
          onDownload={downloadFile}
          onDelete={deleteFile}
          onTogglePin={togglePin}
          onUploadClick={() => setAddFilesOpen(true)}
        />
      )}

      {/* Add Files Modal */}
      <AddFilesModal
        open={addFilesOpen}
        onClose={() => {
          setAddFilesOpen(false);
          // Refetch folder detail metrics on close
          fetchFolderDetails();
        }}
        folderName={folder.name}
        folderId={folder.id}
        onUpload={uploadToFolder}
        existingFiles={files}
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
