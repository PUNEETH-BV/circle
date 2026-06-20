'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Circle as CircleIcon, LogOut, Settings, Plus, Users, LayoutGrid, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { getCircleColor } from '@/lib/utils/getCircleColor';
import { getInitials } from '@/lib/utils/getInitials';
import { cn } from '@/lib/utils';
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
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
      <div className="px-3 mb-4">
        <Link
          href="/"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
            pathname === '/'
              ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/50 text-indigo-700 shadow-sm shadow-indigo-100/30 scale-[1.01]'
              : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 hover:translate-x-0.5'
          )}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
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
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
