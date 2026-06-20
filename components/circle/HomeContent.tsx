'use client';

import { useRouter } from 'next/navigation';
import { Plus, UserPlus, CircleDot, Sparkles, Folder, Users, Bell, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircleCard } from './CircleCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Circle, Profile } from '@/types';
import { useState, useEffect } from 'react';

interface HomeContentProps {
  profile: Profile | null;
  circles: Circle[];
}

export function HomeContent({ profile, circles }: HomeContentProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Compute total aggregates from circles list
  const totalFiles = circles.reduce((acc, c) => acc + (c.file_count || 0), 0);
  const totalMembers = circles.reduce((acc, c) => acc + (c.member_count || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Premium Hero Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 md:p-8 text-white shadow-xl shadow-indigo-950/10 border border-slate-800">
        {/* Glow meshes */}
        <div className="absolute -top-24 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Welcome to your private collaboration workspace. Coordinate your team, share documents, manage tasks, and communicate in real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button 
              onClick={() => router.push('/join-circle')}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Join Circle
            </button>
            <button 
              onClick={() => router.push('/create-circle')}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md hover:shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Circle
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      {circles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_18px_rgba(79,70,229,0.04)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Circles</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CircleDot className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">{circles.length}</span>
              <span className="text-[10px] text-slate-400">active</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_18px_rgba(79,70,229,0.04)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Files</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">{totalFiles}</span>
              <span className="text-[10px] text-slate-400">stored</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_18px_rgba(79,70,229,0.04)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collaborators</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">{totalMembers}</span>
              <span className="text-[10px] text-slate-400">connections</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_18px_rgba(79,70,229,0.04)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity Status</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">Online</span>
              <span className="text-[10px] text-emerald-500 font-bold">Sync Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Circles grid */}
      <div>
        {circles.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">My Circles</h2>
            <span className="text-xs text-slate-400 font-medium">{circles.length} spaces</span>
          </div>
        )}

        {circles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {circles.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CircleDot}
            title="You haven't joined any circles yet"
            description="Create a new circle to start collaborating with your team, or join an existing one with an invite code."
            actionLabel="Create a Circle"
            onAction={() => router.push('/create-circle')}
            secondaryActionLabel="Join a Circle"
            onSecondaryAction={() => router.push('/join-circle')}
          />
        )}
      </div>
    </div>
  );
}
