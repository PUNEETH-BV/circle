'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Circle as CircleIcon, 
  LogOut, 
  Settings, 
  Plus, 
  Users, 
  LayoutGrid, 
  Sparkles, 
  Calendar,
  Camera,
  User,
  Mail,
  X,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { getCircleColor } from '@/lib/utils/getCircleColor';
import { getInitials } from '@/lib/utils/getInitials';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Circle, Profile } from '@/types';

interface SidebarProps {
  circles: Circle[];
  profile: Profile | null;
  email?: string;
  onClose?: () => void;
}

export function Sidebar({ circles, profile, email, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with profile prop updates
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
    if (email) {
      setNewEmail(email);
    }
  }, [profile, email]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          avatar_url: avatarUrl || null
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (newEmail.trim() && newEmail.trim().toLowerCase() !== email?.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: newEmail.trim()
        });
        if (emailError) throw emailError;
        toast.success('Profile name updated! A confirmation email has been sent to confirm your new email address.');
      } else {
        toast.success('Profile updated successfully!');
      }

      setProfileModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to update profile: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Avatar exceeds 5MB size limit');
        return;
      }

      setUploadingAvatar(true);
      try {
        // 1. Get signed URL
        const response = await fetch('/api/profile/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'image/jpeg'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const { signedUrl, filePath } = await response.json();

        // 2. PUT upload file
        await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'image/jpeg' },
          body: file
        });

        // 3. Get public URL
        const publicUrl = supabase.storage
          .from('circle-files')
          .getPublicUrl(filePath).data.publicUrl;

        setAvatarUrl(publicUrl);
        toast.success('Avatar uploaded!');
      } catch (err: any) {
        toast.error('Avatar upload failed: ' + err.message);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/40 lg:bg-white/60 backdrop-blur-xl border-r border-slate-100/80 shadow-[1px_0_0_rgba(0,0,0,0.01)]">
      {/* Premium Logo Header */}
      <div className="p-6 pb-5">
        <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
          <div className="relative w-9 h-9 bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105 duration-300">
            {/* Pulsing ring inside logo */}
            <span className="absolute inset-0.5 bg-white/10 rounded-[10px] border border-white/20 animate-pulse pointer-events-none" />
            <div className="w-5 h-5 bg-white rounded-lg rotate-45 flex items-center justify-center transition-transform group-hover:rotate-90 duration-500">
              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
              Circle
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/20" />
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider -mt-0.5">Workspace</span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="px-3 mb-4 space-y-1">
        <Link
          href="/"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
            pathname === '/'
              ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/50 text-indigo-700 shadow-sm shadow-indigo-100/30 scale-[1.01]'
              : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 hover:translate-x-0.5'
          )}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/deadlines"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
            pathname === '/deadlines'
              ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/50 text-indigo-700 shadow-sm shadow-indigo-100/30 scale-[1.01]'
              : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 hover:translate-x-0.5'
          )}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Deadlines</span>
        </Link>
      </div>

      {/* My Circles Section */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Circles</span>
            <Link 
              href="/create-circle" 
              onClick={onClose}
              className="p-1 rounded-md hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors"
              title="Create a Circle"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          <nav className="space-y-1">
            {circles.map((circle) => {
              const isActive = pathname.startsWith(`/circle/${circle.id}`);
              const color = getCircleColor(circle.id);
              return (
                <Link
                  key={circle.id}
                  href={`/circle/${circle.id}`}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative group',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/50 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-sm shadow-indigo-100/30 scale-[1.01]'
                      : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 hover:translate-x-0.5'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md shadow-black/5"
                    style={{ backgroundColor: color }}
                  >
                    {getInitials(circle.name)}
                  </div>
                  <span className="truncate font-semibold flex-1">{circle.name}</span>
                  {circle.member_count !== undefined && (
                    <span className="text-[10px] text-slate-400 font-medium opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      {circle.member_count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {circles.length === 0 && (
            <div className="px-3 py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
              <p className="text-xs text-slate-400">No circles joined yet</p>
              <Link 
                href="/join-circle" 
                className="text-[10px] text-indigo-600 font-bold hover:underline mt-1 block"
                onClick={onClose}
              >
                Join with a code
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Premium User Account Section */}
      <div className="p-4 border-t border-slate-100/80 bg-white/30 backdrop-blur-md">
        <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50/80 transition-colors">
          <div 
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            title="Edit Profile Settings"
          >
            <UserAvatar
              name={profile?.full_name || email || 'User'}
              avatarUrl={profile?.avatar_url}
              size="sm"
              className="border border-slate-100 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {email || 'Collaborator'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Profile Settings Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-sm w-full space-y-6 relative animate-scaleUp">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-650" />
                <h3 className="text-sm font-bold text-slate-900">Profile Settings</h3>
              </div>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Profile Pic Upload Section */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative group w-20 h-20 rounded-full overflow-hidden border border-slate-100 shadow-md">
                  <UserAvatar
                    name={name || 'User'}
                    avatarUrl={avatarUrl}
                    size="lg"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Upload Overlay */}
                  <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-0.5">Edit DP</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[9px] font-semibold text-slate-400">Click avatar to upload new DP</span>
              </div>

              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProfileModalOpen(false)}
                  className="flex-1 text-xs h-9 rounded-xl border-slate-200 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updating || uploadingAvatar}
                  className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 h-9 rounded-xl font-bold shadow-md shadow-indigo-600/10"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
