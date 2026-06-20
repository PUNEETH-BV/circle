'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Menu, Bell, Search, FileText, File, Loader2, X, Megaphone, BookOpen } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { createClient } from '@/lib/supabase/client';
import { getFileIcon } from '@/lib/utils/getFileIcon';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { NotificationSettingsModal } from '@/components/notifications/NotificationSettingsModal';
import * as Icons from 'lucide-react';
import type { Profile } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TopbarProps {
  title?: string;
  profile: Profile | null;
  email?: string;
  onMenuClick: () => void;
}

export function Topbar({ title, profile, email, onMenuClick }: TopbarProps) {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const circleId = params.circleId as string;

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{
    files: any[];
    notes: any[];
    announcements: any[];
    assignments: any[];
  }>({ files: [], notes: [], announcements: [], assignments: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    nativePermission,
    isPushSupported,
    requestNativePermission,
  } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || !circleId) {
      setResults({ files: [], notes: [], announcements: [], assignments: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const [filesRes, notesRes, announcementsRes, assignmentsRes] = await Promise.all([
          supabase
            .from('files')
            .select('*')
            .eq('circle_id', circleId)
            .ilike('name', `%${query}%`)
            .limit(3)
            .then(res => res, () => ({ data: [] })),
          supabase
            .from('notes')
            .select('*')
            .eq('circle_id', circleId)
            .ilike('title', `%${query}%`)
            .limit(3)
            .then(res => res, () => ({ data: [] })),
          supabase
            .from('announcements')
            .select('*')
            .eq('circle_id', circleId)
            .ilike('title', `%${query}%`)
            .limit(3)
            .then(res => res, () => ({ data: [] })),
          supabase
            .from('assignments')
            .select('*')
            .eq('circle_id', circleId)
            .ilike('title', `%${query}%`)
            .limit(3)
            .then(res => res, () => ({ data: [] })),
        ]);

        setResults({
          files: filesRes.data || [],
          notes: notesRes.data || [],
          announcements: announcementsRes.data || [],
          assignments: assignmentsRes.data || [],
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, circleId]);

  return (
    <>
      <header className="h-16 border-b border-slate-100/80 bg-white/75 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.005)] transition-all duration-300">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100/80 active:scale-95 rounded-lg transition-all flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* breadcrumb title for desktop */}
          {title && (
            <h1 className="text-sm font-bold text-slate-800 hidden md:block flex-shrink-0">
              {title}
            </h1>
          )}

          {/* Global Search Bar (Only visible when inside a circle) */}
          {circleId && (
            <div ref={containerRef} className="relative max-w-md w-full ml-0 md:ml-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search notes or files in this circle..."
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200/80 text-xs bg-slate-50/50 hover:bg-slate-100/50 focus:bg-white transition-all outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-inner"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setResults({ files: [], notes: [], announcements: [], assignments: [] });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 hover:bg-slate-100 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Floating Dropdown Results */}
              {searchOpen && (query.trim()) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-lg border border-indigo-100/50 rounded-xl shadow-[0_10px_35px_rgba(79,70,229,0.15)] max-h-96 overflow-y-auto z-50 p-2 divide-y divide-slate-100/80 animate-fadeIn">
                  {searching ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
                      <span className="font-medium">Searching...</span>
                    </div>
                  ) : results.files.length === 0 && results.notes.length === 0 && results.announcements.length === 0 && results.assignments.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium">
                      No matching items found.
                    </div>
                  ) : (
                    <>
                      {/* Notes Results */}
                      {results.notes.length > 0 && (
                        <div className="py-2 first:pt-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-3 mb-1 block select-none">
                            Notes
                          </span>
                          <div className="space-y-0.5">
                            {results.notes.map((note) => (
                              <Link
                                key={note.id}
                                href={`/circle/${circleId}/notes/${note.id}`}
                                onClick={() => {
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-indigo-50/50 transition-colors text-slate-700 text-xs font-medium"
                              >
                                <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{note.title || 'Untitled Note'}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Announcements Results */}
                      {results.announcements.length > 0 && (
                        <div className="py-2">
                          <span className="text-[10px] font-bold text-amber-550 uppercase tracking-widest px-3 mb-1 block select-none">
                            Announcements
                          </span>
                          <div className="space-y-0.5">
                            {results.announcements.map((ann) => (
                              <Link
                                key={ann.id}
                                href={`/circle/${circleId}`}
                                onClick={() => {
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-amber-50/40 transition-colors text-slate-700 text-xs font-medium"
                              >
                                <div className="w-5 h-5 rounded bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                  <Megaphone className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{ann.title || 'Announcement'}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assignments Results */}
                      {results.assignments.length > 0 && (
                        <div className="py-2">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest px-3 mb-1 block select-none">
                            Assignments
                          </span>
                          <div className="space-y-0.5">
                            {results.assignments.map((assign) => (
                              <Link
                                key={assign.id}
                                href={`/circle/${circleId}/assignments`}
                                onClick={() => {
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50/40 transition-colors text-slate-700 text-xs font-medium"
                              >
                                <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{assign.title}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Files Results */}
                      {results.files.length > 0 && (
                        <div className="py-2 last:pb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1 block select-none">
                            Files
                          </span>
                          <div className="space-y-0.5">
                            {results.files.map((file) => {
                              const iconName = getFileIcon(file.file_type);
                              const IconComponent = (Icons as any)[iconName] || File;
                              return (
                                <Link
                                  key={file.id}
                                  href={`/circle/${circleId}/files`}
                                  onClick={() => {
                                    setSearchOpen(false);
                                    setQuery('');
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100/50 transition-colors text-slate-700 text-xs font-medium"
                                >
                                  <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                    <IconComponent className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="truncate">{file.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={() => setPanelOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-650 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>
          <UserAvatar
            name={profile?.full_name || email || 'User'}
            avatarUrl={profile?.avatar_url}
            size="sm"
          />
        </div>
      </header>

      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        notifications={notifications}
        loading={loading}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onOpenSettings={circleId ? () => setSettingsOpen(true) : undefined}
        nativePermission={nativePermission}
        isPushSupported={isPushSupported}
        onRequestNativePermission={requestNativePermission}
      />

      {circleId && (
        <NotificationSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          circleId={circleId}
          circleName={title || 'this circle'}
        />
      )}
    </>
  );
}

