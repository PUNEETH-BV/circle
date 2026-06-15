'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileDrawer } from './MobileDrawer';
import type { Circle, Profile } from '@/types';

interface AppShellProps {
  profile: Profile | null;
  circles: Circle[];
  children: React.ReactNode;
  userEmail?: string;
}

export function AppShell({ profile, circles, children, userEmail }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!profile?.id) return;

    // Listen to membership changes (joined or removed) to refresh the sidebar
    const channel = supabase
      .channel(`member-refresh-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_members',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, router, supabase]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[260px] lg:flex-col">
        <Sidebar circles={circles} profile={profile} email={userEmail} />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        circles={circles}
        profile={profile}
        email={userEmail}
      />

      {/* Main content */}
      <div className="lg:pl-[260px]">
        <Topbar
          profile={profile}
          email={userEmail}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
