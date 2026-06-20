'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FolderOpen, FileText, Users, Settings, Inbox, MessageSquare, CheckSquare, Calendar, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';

interface CircleTabNavProps {
  circleId: string;
  circleName: string;
  isAdmin: boolean;
}

export function CircleTabNav({ circleId, circleName, isAdmin }: CircleTabNavProps) {
  const pathname = usePathname();
  const basePath = `/circle/${circleId}`;
  const supabase = createClient();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('circle_id', circleId)
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();

    // Subscribe to realtime requests updates
    const channel = supabase
      .channel(`circle-requests-nav-count-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_requests',
        filter: `circle_id=eq.${circleId}`
      }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, isAdmin]);

  const tabs = [
    { label: 'Home', href: basePath, icon: Home, exact: true },
    { label: 'Chat', href: `${basePath}/chat`, icon: MessageSquare },
    { label: 'Tasks', href: `${basePath}/tasks`, icon: CheckSquare },
    { label: 'Events', href: `${basePath}/events`, icon: Calendar },
    { label: 'Assignments', href: `${basePath}/assignments`, icon: BookOpen },
    { label: 'Files', href: `${basePath}/files`, icon: FolderOpen },
    { label: 'Notes', href: `${basePath}/notes`, icon: FileText },
    { label: 'Members', href: `${basePath}/members`, icon: Users },
    ...(isAdmin ? [
      {
        label: 'Requests',
        href: `${basePath}/requests`,
        icon: Inbox,
        badge: pendingCount > 0 ? pendingCount : undefined
      },
      { label: 'Settings', href: `${basePath}/settings`, icon: Settings }
    ] : []),
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">{circleName}</h1>
      <nav className="flex gap-1 border-b border-slate-100 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2',
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge className="bg-red-500 text-white rounded-full px-1.5 py-0 text-[10px] ml-1 select-none pointer-events-none font-bold">
                  {tab.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
