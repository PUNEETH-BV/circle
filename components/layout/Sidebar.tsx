'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Circle as CircleIcon, LogOut, Settings, Plus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { getCircleColor } from '@/lib/utils/getCircleColor';
import { getInitials } from '@/lib/utils/getInitials';
import { cn } from '@/lib/utils';
import type { Circle, Profile } from '@/types';

interface SidebarProps {
  circles: Circle[];
  profile: Profile | null;
  onClose?: () => void;
}

export function Sidebar({ circles, profile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="p-6 pb-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-full" />
          </div>
          <span className="text-xl font-semibold text-slate-900">Circle</span>
        </Link>
      </div>

      {/* My Circles */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">My Circles</span>
          <Link href="/create-circle" onClick={onClose}>
            <Plus className="w-4 h-4 text-slate-400 hover:text-indigo-600 transition-colors" />
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 ml-0'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {getInitials(circle.name)}
                </div>
                <span className="truncate font-medium">{circle.name}</span>
              </Link>
            );
          })}
        </nav>

        {circles.length === 0 && (
          <p className="text-sm text-slate-400 px-3 py-4">No circles yet</p>
        )}
      </div>

      {/* User section */}
      <div className="border-t border-slate-100 p-4">
        {profile && (
          <div className="flex items-center gap-3">
            <UserAvatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{profile.full_name}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
