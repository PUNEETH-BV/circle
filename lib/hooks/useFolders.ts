'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Folder, Category } from '@/types';
import { toast } from 'sonner';

export function useFolders(circleId: string) {
  const supabase = createClient();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
    fetchCategories();

    // Realtime subscription for folders
    const channel = supabase
      .channel(`circle-folders-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folders',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        fetchFolders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchFolders() {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*, creator:profiles(*)')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data as Folder[] || []);
    } catch (err: any) {
      toast.error('Failed to load folders: ' + err.message);
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

  async function createFolder(name: string, description?: string, categoryId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('folders')
        .insert({
          circle_id: circleId,
          category_id: categoryId || null,
          created_by: user.id,
          name: name.trim(),
          description: description?.trim() || null,
          pinned: false,
          file_count: 0
        })
        .select('*, creator:profiles(*)')
        .single();

      if (error) throw error;
      setFolders(prev => [data as Folder, ...prev]);
      return data as Folder;
    } catch (err: any) {
      toast.error('Failed to create folder: ' + err.message);
      throw err;
    }
  }

  async function deleteFolder(folderId: string) {
    try {
      // 1. Fetch files in folder to delete from storage
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('file_path')
        .eq('folder_id', folderId);

      if (filesError) throw filesError;

      if (files && files.length > 0) {
        const filePaths = files.map(f => f.file_path);
        const { error: storageError } = await supabase.storage
          .from('circle-files')
          .remove(filePaths);

        if (storageError) {
          console.error('Failed to delete some files from storage:', storageError);
        }
      }

      // 2. Delete folder (will cascade delete files in DB)
      const { error: dbError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (dbError) throw dbError;

      toast.success('Folder deleted successfully');
      setFolders(prev => prev.filter(f => f.id !== folderId));
    } catch (err: any) {
      toast.error('Failed to delete folder: ' + err.message);
      throw err;
    }
  }

  async function pinFolder(folderId: string, pinned: boolean) {
    try {
      const { error } = await supabase
        .from('folders')
        .update({ pinned })
        .eq('id', folderId);

      if (error) throw error;
      toast.success(pinned ? 'Folder pinned' : 'Folder unpinned');
      setFolders(prev =>
        prev.map(f => (f.id === folderId ? { ...f, pinned } : f))
      );
    } catch (err: any) {
      toast.error('Failed to update folder pin: ' + err.message);
      throw err;
    }
  }

  async function uploadToFolder(
    folderId: string,
    filesList: File[],
    onProgress?: (fileName: string, progress: number) => void
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    for (const file of filesList) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 50MB size limit and was skipped.`);
        continue;
      }

      try {
        // Get signed upload URL
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            circleId,
            folderId,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const { signedUrl, filePath } = await response.json();

        // Perform file upload
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signedUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(file.name, percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });

        // Insert metadata
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            circle_id: circleId,
            folder_id: folderId,
            uploaded_by: user.id,
            name: file.name,
            file_path: filePath,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
          });

        if (dbError) throw dbError;
        if (onProgress) onProgress(file.name, 100);
      } catch (err: any) {
        toast.error(`Failed to upload "${file.name}": ${err.message}`);
        throw err;
      }
    }

    // Refresh folders counts
    fetchFolders();
  }

  async function updateFolder(
    folderId: string,
    name: string,
    description?: string,
    categoryId?: string
  ) {
    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: name.trim(),
          description: description?.trim() || null,
          category_id: categoryId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId);

      if (error) throw error;
      toast.success('Folder updated successfully');
      fetchFolders();
    } catch (err: any) {
      toast.error('Failed to update folder: ' + err.message);
      throw err;
    }
  }

  return {
    folders,
    categories,
    loading,
    createFolder,
    deleteFolder,
    pinFolder,
    uploadToFolder,
    updateFolder,
    refreshFolders: fetchFolders
  };
}
