'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FileRecord, Category } from '@/types';
import { toast } from 'sonner';

export function useFiles(circleId: string, folderId?: string) {
  const supabase = createClient();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchFiles();
    fetchCategories();

    // Realtime subscription for files
    const channel = supabase
      .channel(`circle-files-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'files',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        // Simple refetch to get populated uploader/category relations
        fetchFiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, folderId]);

  async function fetchFiles() {
    try {
      let query = supabase
        .from('files')
        .select('*, uploader:profiles(*), category:categories(*)')
        .eq('circle_id', circleId);

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      toast.error('Failed to load files: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('circle_id', circleId)
        .order('position', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  }

  async function uploadFile(file: File, description?: string, categoryId?: string) {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File exceeds 50MB size limit.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2. Request signed upload URL from Next API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circleId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { signedUrl, filePath } = await response.json();

      // 3. Perform upload with XMLHttpRequest to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      // 4. Insert file metadata into database
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          circle_id: circleId,
          category_id: categoryId || null,
          uploaded_by: user.id,
          name: file.name,
          description: description || null,
          file_path: filePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success(`Successfully uploaded "${file.name}"`);
      fetchFiles();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function deleteFile(file: FileRecord) {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('circle-files')
        .remove([file.file_path]);

      if (storageError) {
        console.error('Storage deletion error (continuing database cleanup):', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast.success(`Deleted "${file.name}"`);
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err: any) {
      toast.error('Failed to delete file: ' + err.message);
    }
  }

  async function togglePin(file: FileRecord) {
    try {
      const { error } = await supabase
        .from('files')
        .update({ pinned: !file.pinned })
        .eq('id', file.id);

      if (error) throw error;
      toast.success(file.pinned ? 'Unpinned file' : 'Pinned file');
      setFiles(prev =>
        prev.map(f => (f.id === file.id ? { ...f, pinned: !f.pinned } : f))
      );
    } catch (err: any) {
      toast.error('Failed to update pin: ' + err.message);
    }
  }

  async function downloadFile(file: FileRecord) {
    try {
      // 1. Get signed download URL
      const { data, error } = await supabase.storage
        .from('circle-files')
        .createSignedUrl(file.file_path, 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Could not generate download link');

      // 2. Open link in a new tab or trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 3. Try incrementing download count
      await supabase
        .from('files')
        .update({ download_count: file.download_count + 1 })
        .eq('id', file.id);

      setFiles(prev =>
        prev.map(f =>
          f.id === file.id ? { ...f, download_count: f.download_count + 1 } : f
        )
      );
    } catch (err: any) {
      toast.error('Failed to download file: ' + err.message);
    }
  }

  return {
    files,
    categories,
    loading,
    uploading,
    uploadProgress,
    uploadFile,
    deleteFile,
    togglePin,
    downloadFile,
    refreshFiles: fetchFiles,
  };
}
