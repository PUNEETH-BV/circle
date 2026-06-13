'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FolderOpen, FileText, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircleTabNavProps {
  circleId: string;
  circleName: string;
  isAdmin: boolean;
}

export function CircleTabNav({ circleId, circleName, isAdmin }: CircleTabNavProps) {
  const pathname = usePathname();
  const basePath = `/circle/${circleId}`;

  const tabs = [
    { label: 'Home', href: basePath, icon: Home, exact: true },
    { label: 'Files', href: `${basePath}/files`, icon: FolderOpen },
    { label: 'Notes', href: `${basePath}/notes`, icon: FileText },
    { label: 'Members', href: `${basePath}/members`, icon: Users },
    ...(isAdmin ? [{ label: 'Settings', href: `${basePath}/settings`, icon: Settings }] : []),
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
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
