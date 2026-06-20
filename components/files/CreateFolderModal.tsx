'use client';

import { useState, useRef } from 'react';
import { X, FolderPlus, Upload, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatFileSize } from '@/lib/utils/formatFileSize';
import type { Category } from '@/types';
import { toast } from 'sonner';

interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, description?: string, categoryId?: string) => Promise<any>;
  onUploadToFolder: (
    folderId: string,
    files: File[],
    onProgress?: (fileName: string, progress: number) => void
  ) => Promise<void>;
  categories: Category[];
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

export function CreateFolderModal({
  open,
  onClose,
  onCreateFolder,
  onUploadToFolder,
  categories,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filesToUpload, setFilesToUpload] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const addFiles = (filesList: FileList) => {
    const newFiles: UploadingFile[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 100MB limit and was skipped.`);
        continue;
      }
      // Check for duplicates
      if (filesToUpload.some(f => f.file.name === file.name && f.file.size === file.size)) {
        continue;
      }
      newFiles.push({ file, progress: 0, status: 'idle' });
    }
    setFilesToUpload(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setName('');
    setDescription('');
    setCategoryId('');
    setFilesToUpload([]);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    let createdFolderId = '';

    try {
      // 1. Create the empty folder
      const folder = await onCreateFolder(name.trim(), description.trim(), categoryId || undefined);
      createdFolderId = folder.id;

      if (filesToUpload.length > 0) {
        // Update states to uploading
        setFilesToUpload(prev => prev.map(f => ({ ...f, status: 'uploading' })));

        // 2. Upload each file sequentially to support separate progress bars
        for (let i = 0; i < filesToUpload.length; i++) {
          const target = filesToUpload[i];
          try {
            await onUploadToFolder(folder.id, [target.file], (fileName, progress) => {
              setFilesToUpload(prev =>
                prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
              );
            });
            setFilesToUpload(prev =>
              prev.map((f, idx) => (idx === i ? { ...f, status: 'success', progress: 100 } : f))
            );
          } catch (err: any) {
            setFilesToUpload(prev =>
              prev.map((f, idx) =>
                idx === i ? { ...f, status: 'error', errorMsg: err.message || 'Upload failed' } : f
              )
            );
            // We continue uploading other files even if one fails
          }
        }
      }

      toast.success(`Folder "${name}" created successfully!`);
      // Wait a brief moment to show checkmarks before closing
      setTimeout(() => {
        handleClear();
        onClose();
        // Redirect if it was a single file upload auto-created folder
        if (filesToUpload.length === 1 && filesToUpload[0].status === 'success') {
          window.location.href = `/circle/${folder.circle_id}/files/${folder.id}`;
        }
      }, 1000);
    } catch (err: any) {
      toast.error('Failed to create folder: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-xl w-full mx-4 z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FolderPlus className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">New Folder</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folder Name */}
          <div className="space-y-1.5">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lecture Notes, Marketing Slides"
              disabled={submitting}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="folderDesc">Description (Optional)</Label>
            <Textarea
              id="folderDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief summary of what's inside..."
              className="resize-none h-16"
              disabled={submitting}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="folderCategory">Category</Label>
            <select
              id="folderCategory"
              disabled={submitting}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-50"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropzone */}
          <div className="space-y-2">
            <Label>Files to Upload (Optional)</Label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !submitting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-indigo-600 bg-indigo-50/50'
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
              } ${submitting ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileChange}
                disabled={submitting}
              />
              <Upload className="w-7 h-7 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700 text-center">
                Drag & drop files here, or{' '}
                <span className="text-indigo-600">browse</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Maximum size per file: 50MB</p>
            </div>
          </div>

          {/* Files List with Progress Bars */}
          {filesToUpload.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2.5 bg-slate-50">
              {filesToUpload.map((f, i) => (
                <div key={i} className="flex flex-col gap-1.5 p-2 bg-white rounded-md border border-slate-100">
                  <div className="flex items-center justify-between text-xs min-w-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={f.file.name}>
                        {f.file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        ({formatFileSize(f.file.size)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {f.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                      {f.status === 'error' && <span title={f.errorMsg}><AlertCircle className="w-3.5 h-3.5 text-red-500" /></span>}
                      {f.status === 'uploading' && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                      
                      {!submitting && f.status === 'idle' && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {f.status === 'uploading' && (
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting} className="gap-1.5">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
