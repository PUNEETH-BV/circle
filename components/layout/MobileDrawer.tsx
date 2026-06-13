'use client';

import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { Circle, Profile } from '@/types';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  circles: Circle[];
  profile: Profile | null;
}

export function MobileDrawer({ open, onClose, circles, profile }: MobileDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-xl">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar circles={circles} profile={profile} onClose={onClose} />
      </div>
    </div>
  );
}
