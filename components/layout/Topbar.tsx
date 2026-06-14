'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Menu, Bell, Search, FileText, File, Loader2, X } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getFileIcon } from '@/lib/utils/getFileIcon';
import * as Icons from 'lucide-react';
import type { Profile } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TopbarProps {
  title?: string;
  profile: Profile | null;
  onMenuClick: () => void;
}

export function Topbar({ title, profile, onMenuClick }: TopbarProps) {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const circleId = params.circleId as string;

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ files: any[]; notes: any[] }>({ files: [], notes: [] });
  const containerRef = useRef<HTMLDivElement>(null);

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
      setResults({ files: [], notes: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const [filesRes, notesRes] = await Promise.all([
          supabase
            .from('files')
            .select('*')
            .eq('circle_id', circleId)
            .ilike('name', `%${query}%`)
            .limit(4),
          supabase
            .from('notes')
            .select('*')
            .eq('circle_id', circleId)
            .ilike('title', `%${query}%`)
            .limit(4),
        ]);

        setResults({
          files: filesRes.data || [],
          notes: notesRes.data || [],
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
    <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* breadcrumb title for desktop */}
        {title && (
          <h1 className="text-sm font-semibold text-slate-800 hidden md:block flex-shrink-0">
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
                placeholder="Search note or file inside circle..."
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults({ files: [], notes: [] });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Floating Dropdown Results */}
            {searchOpen && (query.trim()) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50 p-2 divide-y divide-slate-50">
                {searching ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Searching...</span>
                  </div>
                ) : results.files.length === 0 && results.notes.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No matching files or notes found.
                  </div>
                ) : (
                  <>
                    {/* Notes Results */}
                    {results.notes.length > 0 && (
                      <div className="py-2 first:pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1 block select-none">
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
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-xs"
                            >
                              <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                              <span className="font-semibold truncate">{note.title || 'Untitled Note'}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files Results */}
                    {results.files.length > 0 && (
                      <div className="py-2 last:pb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1 block select-none">
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
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-xs"
                              >
                                <IconComponent className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="font-semibold truncate">{file.name}</span>
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
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        {profile && (
          <UserAvatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
        )}
      </div>
    </header>
  );
}

