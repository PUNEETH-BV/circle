'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2, ShieldAlert, Key, FolderPlus, ArrowUp, ArrowDown, Edit2, Check, X, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useCircle } from '@/lib/hooks/useCircle';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { generateInviteCode } from '@/lib/utils/generateInviteCode';
import { toast } from 'sonner';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.circleId as string;
  const supabase = getSupabaseBrowserClient();

  const { circle, loading: loadingCircle, userRole, refreshCircle } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  // Forms states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [updatingInfo, setUpdatingInfo] = useState(false);

  // Avatar states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories states
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [catToDelete, setCatToDelete] = useState<string | null>(null);

  // Danger zone states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingCircle, setDeletingCircle] = useState(false);

  useEffect(() => {
    if (circle) {
      setName(circle.name);
      setDescription(circle.description || '');
    }
  }, [circle]);

  useEffect(() => {
    fetchCategories();
  }, [circleId]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('circle_id', circleId)
        .order('position', { ascending: true });

      if (error) throw error;
      setCategories(data as Category[] || []);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  if (loadingCircle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-slate-500 bg-white border border-slate-100 rounded-xl p-8 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading settings...</span>
      </div>
    );
  }

  // Admin access guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-8 bg-white border border-slate-100 rounded-xl max-w-md mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h4 className="text-lg font-semibold text-slate-900 mb-1">Access Denied</h4>
        <p className="text-sm text-slate-500">
          Only circle administrators have permission to access the Settings tab.
        </p>
      </div>
    );
  }

  // Update Name & Description
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Circle name cannot be empty');
      return;
    }

    setUpdatingInfo(true);
    try {
      const { error } = await supabase
        .from('circles')
        .update({ name: name.trim(), description: description.trim() })
        .eq('id', circleId);

      if (error) throw error;
      toast.success('Workspace information updated successfully');
      refreshCircle();
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setUpdatingInfo(false);
    }
  };

  // Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Avatar image exceeds 5MB size limit');
        return;
      }

      setUploadingAvatar(true);
      try {
        const filePath = `${circleId}/avatars/${Date.now()}-${file.name}`;
        
        // Upload file to circle-files bucket
        const { error: uploadError } = await supabase.storage
          .from('circle-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('circle-files')
          .getPublicUrl(filePath);

        // Update circles table
        const { error: updateError } = await supabase
          .from('circles')
          .update({ avatar_url: publicUrl })
          .eq('id', circleId);

        if (updateError) throw updateError;

        toast.success('Circle avatar updated!');
        refreshCircle();
        router.refresh();
      } catch (err: any) {
        toast.error('Avatar upload failed: ' + err.message);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  // Regenerate Invite Code
  const handleRegenerateCode = async () => {
    const newCode = generateInviteCode();
    try {
      const { error } = await supabase
        .from('circles')
        .update({ invite_code: newCode })
        .eq('id', circleId);

      if (error) throw error;
      toast.success('Invite code regenerated successfully!');
      refreshCircle();
    } catch (err: any) {
      toast.error('Failed to regenerate code: ' + err.message);
    }
  };

  // Categories Operations
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          circle_id: circleId,
          name: newCatName.trim(),
          position: categories.length,
        });

      if (error) throw error;
      setNewCatName('');
      toast.success('Category added');
      fetchCategories();
    } catch (err: any) {
      toast.error('Failed to add category: ' + err.message);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleSaveCategoryName = async (catId: string) => {
    if (!editingCatName.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingCatName.trim() })
        .eq('id', catId);

      if (error) throw error;
      setEditingCatId(null);
      toast.success('Category renamed');
      fetchCategories();
    } catch (err: any) {
      toast.error('Failed to rename category: ' + err.message);
    }
  };

  const handleDeleteCategory = async () => {
    if (!catToDelete) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catToDelete);

      if (error) throw error;
      setCatToDelete(null);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err: any) {
      toast.error('Failed to delete category: ' + err.message);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    // Swap positions locally
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    try {
      // Update DB positions
      const updates = list.map((cat, pos) =>
        supabase
          .from('categories')
          .update({ position: pos })
          .eq('id', cat.id)
      );

      await Promise.all(updates);
      setCategories(list);
    } catch (err: any) {
      toast.error('Failed to reorder: ' + err.message);
    }
  };

  // Delete Workspace (Danger Zone)
  const handleDeleteCircle = async () => {
    if (deleteConfirmText !== circle?.name) {
      toast.error('Confirmation name does not match');
      return;
    }

    setDeletingCircle(true);
    try {
      // Deleting a circle cascades deletes to files, notes, announcements, circle_members in the schema
      const { error } = await supabase
        .from('circles')
        .delete()
        .eq('id', circleId);

      if (error) throw error;

      toast.success(`Deleted workspace "${circle.name}"`);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to delete circle: ' + err.message);
      setDeletingCircle(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* General Settings */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">General Settings</h3>
          <p className="text-xs text-slate-500 mt-1">Manage details and branding of this circle.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar Upload Container */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Workspace Avatar
            </span>
            <div className="relative group w-24 h-24 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-sm overflow-hidden select-none">
              {circle?.avatar_url ? (
                <img src={circle.avatar_url} alt={circle.name} className="w-full h-full object-cover" />
              ) : (
                circle?.name.substring(0, 2).toUpperCase()
              )}
              {uploadingAvatar ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px]"
                >
                  <Camera className="w-5 h-5 mb-1" />
                  Change
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleUpdateInfo} className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="circleName">Circle Name</Label>
              <Input
                id="circleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
                disabled={updatingInfo}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="circleDesc">Description (Optional)</Label>
              <Textarea
                id="circleDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this workspace is for..."
                className="h-20 resize-none"
                disabled={updatingInfo}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updatingInfo}>
                {updatingInfo ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Invite Code Regeneration */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Invite Code Management</h3>
          <p className="text-xs text-slate-500 mt-1">
            Regenerating the invite code will invalidate the previous code immediately.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-lg">
          <div className="space-y-1 text-center sm:text-left">
            <code className="text-lg font-bold font-mono text-slate-800 tracking-widest bg-white px-3 py-1 rounded border border-slate-100">
              {circle?.invite_code}
            </code>
            <p className="text-[10px] text-slate-400 mt-1">Active invite code for this workspace</p>
          </div>
          <Button variant="outline" className="gap-1.5 h-9 text-xs" onClick={handleRegenerateCode}>
            <Key className="w-3.5 h-3.5" />
            <span>Regenerate Invite Code</span>
          </Button>
        </div>
      </div>

      {/* Categories CRUD Management */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Manage Categories</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create and reorder file/note filter categories for members.
          </p>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Design assets, Docs..."
            className="h-9"
          />
          <Button type="submit" size="sm" className="h-9 gap-1 flex-shrink-0">
            <FolderPlus className="w-4 h-4" />
            <span>Add Category</span>
          </Button>
        </form>

        {/* Categories List */}
        {loadingCategories ? (
          <div className="space-y-2 py-4">
            <div className="h-8 rounded bg-slate-100 skeleton w-full" />
            <div className="h-8 rounded bg-slate-100 skeleton w-5/6" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No categories configured yet.</p>
        ) : (
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-w-xl">
            {categories.map((cat, index) => {
              const isEditing = editingCatId === cat.id;
              return (
                <div key={cat.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors bg-white group">
                  {/* Category Name / Edit Input */}
                  <div className="flex-1 min-w-0 mr-4">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="h-8 max-w-xs text-xs font-semibold px-2 py-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => handleSaveCategoryName(cat.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 hover:text-slate-600 hover:bg-slate-100"
                          onClick={() => setEditingCatId(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-800 truncate block">
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {/* Ordering & Actions */}
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <>
                        {/* Move Up */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                          disabled={index === 0}
                          onClick={() => handleMoveCategory(index, 'up')}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        {/* Move Down */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                          disabled={index === categories.length - 1}
                          onClick={() => handleMoveCategory(index, 'down')}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        {/* Rename */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => handleStartEditCategory(cat)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {/* Delete */}
                        {cat.name !== 'General' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setCatToDelete(cat.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-red-600">Danger Zone</h3>
          <p className="text-xs text-slate-500 mt-1">
            Permanently delete this workspace and all associated files, categories, and notes. This is irreversible.
          </p>
        </div>

        <div className="flex justify-start">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Circle
          </Button>
        </div>
      </div>

      {/* Delete Category Warning */}
      <ConfirmDialog
        open={catToDelete !== null}
        onClose={() => setCatToDelete(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        description="Are you sure you want to delete this category? Files and notes inside this category will remain, but will lose their category association."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Delete Circle Dialog (Double Confirmation) */}
      <div className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        showDeleteConfirm ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
        <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 z-10 border border-slate-100">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Workspace</h3>
              <p className="text-slate-500 text-sm mt-1">
                This will delete <strong className="text-slate-800">{circle?.name}</strong>, all notes, uploaded storage files, and member tables.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="confirmText" className="text-xs font-semibold text-slate-600">
              Type <strong className="text-slate-800 font-mono">{circle?.name}</strong> to confirm:
            </Label>
            <Input
              id="confirmText"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={circle?.name}
              className="h-9 font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText('');
            }} disabled={deletingCircle}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCircle}
              disabled={deleteConfirmText !== circle?.name || deletingCircle}
            >
              {deletingCircle ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
