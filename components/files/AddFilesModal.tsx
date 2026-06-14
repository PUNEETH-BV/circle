'use client';

import { useState, useRef } from 'react';
import { X, Upload, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatFileSize } from '@/lib/utils/formatFileSize';
import { toast } from 'sonner';

interface AddFilesModalProps {
  open: boolean;
  onClose: () => void;
  folderName: string;
  folderId: string;
  onUpload: (
    folderId: string,
    files: File[],
    onProgress?: (fileName: string, progress: number) => void
  ) => Promise<void>;
  existingFiles: any[];
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

export function AddFilesModal({
  open,
  onClose,
  folderName,
  folderId,
  onUpload,
  existingFiles,
}: AddFilesModalProps) {
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
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB limit and was skipped.`);
        continue;
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filesToUpload.length === 0) return;

    setSubmitting(true);
    try {
      setFilesToUpload(prev => prev.map(f => ({ ...f, status: 'uploading' })));

      for (let i = 0; i < filesToUpload.length; i++) {
        const target = filesToUpload[i];
        try {
          await onUpload(folderId, [target.file], (fileName, progress) => {
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
        }
      }

      toast.success('Files uploaded successfully!');
      setTimeout(() => {
        setFilesToUpload([]);
        setSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      toast.error('Failed to upload files: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-lg w-full mx-4 z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Add Files to "{folderName}"</h3>

        {/* Existing files summary */}
        {existingFiles.length > 0 && (
          <div className="mb-4 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold block mb-1">Files currently in folder:</span>
            <div className="max-h-20 overflow-y-auto divide-y divide-slate-100">
              {existingFiles.map((file, idx) => (
                <div key={idx} className="py-1 flex justify-between min-w-0">
                  <span className="truncate pr-4">{file.name}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {formatFileSize(file.file_size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !submitting && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
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
            <Upload className="w-8 h-8 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700 text-center">
              Drag & drop files here, or{' '}
              <span className="text-indigo-600">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Maximum size per file: 50MB</p>
          </div>

          {/* Upload list */}
          {filesToUpload.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50">
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
                      {f.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                      
                      {!submitting && f.status === 'idle' && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
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

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={filesToUpload.length === 0 || submitting}>
              {submitting ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
