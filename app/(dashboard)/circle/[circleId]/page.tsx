'use client';

import { useState } from 'react';
import { useCircle } from '@/lib/hooks/useCircle';
import { Copy, Check, Megaphone, Plus, Activity, Paperclip, X, Film, Loader2, Sparkles, FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { getCircleColor } from '@/lib/utils/getCircleColor';
import { getInitials } from '@/lib/utils/getInitials';
import { formatDate } from '@/lib/utils/formatDate';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function CircleHomePage({ params }: { params: { circleId: string } }) {
  const { circleId } = params;
  const { 
    circle, 
    announcements, 
    loading, 
    userRole, 
    activities,
    loadingActivities,
    currentUserId,
    createAnnouncement, 
    toggleReaction 
  } = useCircle(circleId);

  const [copied, setCopied] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const supabase = createClient();

  const copyInviteCode = () => {
    if (!circle) return;
    const link = `${window.location.origin}/join-circle?code=${circle.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast.error('Please fill in both title and body');
      return;
    }
    setPosting(true);
    try {
      const uploadedMedia: { url: string; type: 'image' | 'video' }[] = [];

      for (const file of mediaFiles) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds 20MB limit and was skipped.`);
          continue;
        }

        const filePath = `${circleId}/announcements/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('circle-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('circle-files')
          .getPublicUrl(filePath);

        uploadedMedia.push({
          url: publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        });
      }

      await createAnnouncement(
        announcementTitle.trim(),
        announcementBody.trim(),
        uploadedMedia
      );

      setAnnouncementTitle('');
      setAnnouncementBody('');
      setMediaFiles([]);
      setShowAnnouncementForm(false);
      toast.success('Announcement posted!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to post announcement: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleEnhanceAnnouncement = async (tone: string) => {
    if (!announcementBody.trim()) {
      toast.error('Please draft announcement text first to refine.');
      return;
    }
    setEnhancing(true);
    const toastId = toast.loading('AI is crafting your announcement...');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine',
          text: announcementBody,
          tone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refine text');

      setAnnouncementBody(data.result);
      toast.success('Refined by Gemini AI!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'AI refinement failed', { id: toastId });
    } finally {
      setEnhancing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 skeleton rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!circle) return null;

  const color = getCircleColor(circle.id);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Circle header banner */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div 
          className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-[0.03] pointer-events-none"
          style={{ backgroundColor: color }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0 shadow-md"
            style={{ backgroundColor: color }}
          >
            {getInitials(circle.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{circle.name}</h2>
            {circle.description ? (
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">{circle.description}</p>
            ) : (
              <p className="text-slate-400 text-xs italic mt-1">No description available for this workspace.</p>
            )}
          </div>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/50 rounded-full text-xs font-semibold text-slate-600 transition-all self-start cursor-pointer shadow-sm"
          >
            <span className="font-mono text-[10px]">{circle.invite_code}</span>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Split Columns Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Span 2): Feed & Post Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-indigo-600" />
              Community Announcements
            </h3>
            {userRole === 'admin' && (
              <Button 
                size="sm" 
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs gap-1 h-8 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Draft Post
              </Button>
            )}
          </div>

          {/* Expanded Post Composer Form */}
          {showAnnouncementForm && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Draft Announcement</span>
                {userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">✨ AI Tone Rewrite:</span>
                    <div className="inline-flex gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-150">
                      {['professional', 'casual', 'inspiring'].map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => handleEnhanceAnnouncement(tone)}
                          disabled={posting || enhancing}
                          className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all uppercase tracking-wide cursor-pointer disabled:opacity-50"
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                placeholder="Subject title..."
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                disabled={posting || enhancing}
                className="text-xs h-9 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
              <Textarea
                placeholder="What details would you like to broadcast? Write a rough draft, then try the AI Rewrite buttons above to polish!"
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                rows={4}
                disabled={posting || enhancing}
                className="text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              />

              {/* Media Previews */}
              {mediaFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {mediaFiles.map((file, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Film className="w-6 h-6 text-slate-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-4.5 h-4.5 bg-slate-900/70 hover:bg-slate-950 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                        disabled={posting || enhancing}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-50">
                <div>
                  <input
                    id="mediaPicker"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        const filesArray = Array.from(e.target.files);
                        setMediaFiles(prev => [...prev, ...filesArray]);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('mediaPicker')?.click()}
                    disabled={posting || enhancing}
                    className="text-slate-500 hover:text-indigo-600 gap-1.5 h-8 text-xs rounded-lg border-slate-200"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Add Media</span>
                  </Button>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowAnnouncementForm(false);
                      setMediaFiles([]);
                      setAnnouncementTitle('');
                      setAnnouncementBody('');
                    }} 
                    disabled={posting || enhancing} 
                    className="h-8 text-xs rounded-lg border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handlePostAnnouncement} 
                    disabled={posting || enhancing} 
                    className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs rounded-lg shadow-md shadow-indigo-600/10 font-bold"
                  >
                    {posting ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Posting...</>
                    ) : (
                      'Post Announcement'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Announcements list */}
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div 
                  key={a.id} 
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_18px_rgba(0,0,0,0.02)] transition-shadow relative overflow-hidden"
                >
                  {/* Circle border accent */}
                  <span className="absolute left-0 top-0 bottom-0 w-1 pointer-events-none" style={{ backgroundColor: color }} />
                  
                  <div className="flex items-start gap-3">
                    <UserAvatar 
                      name={a.author?.full_name || 'User'} 
                      avatarUrl={a.author?.avatar_url} 
                      size="sm" 
                      className="border border-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{a.author?.full_name || 'User'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{formatDate(a.created_at)}</span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-900 mt-1.5 text-sm tracking-tight">{a.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words font-medium whitespace-pre-wrap">{a.body}</p>

                      {/* Announcement Media Attachments */}
                      {a.media && Array.isArray(a.media) && a.media.length > 0 && (
                        <div className={cn(
                          "mt-4 gap-2 grid rounded-xl overflow-hidden border border-slate-100 bg-slate-50 p-1.5",
                          a.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        )}>
                          {a.media.map((item: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="relative rounded-lg overflow-hidden bg-slate-100 max-h-60 flex items-center justify-center border border-slate-200/50"
                            >
                              {item.type === 'image' ? (
                                <img 
                                  src={item.url} 
                                  alt={`Attachment ${idx + 1}`} 
                                  className="w-full h-full object-cover max-h-60 hover:scale-[1.01] transition-transform duration-200 cursor-zoom-in"
                                  onClick={() => window.open(item.url, '_blank')}
                                />
                              ) : (
                                <video 
                                  src={item.url} 
                                  controls 
                                  className="w-full h-full object-contain max-h-60"
                                  preload="metadata"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Emoji Reactions Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-1.5 items-center">
                        {['👍', '🎉', '❤️', '💡'].map((emoji) => {
                          const list = a.reactions?.[emoji] || [];
                          const hasReacted = currentUserId ? list.includes(currentUserId) : false;
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(a.id, emoji)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-90 cursor-pointer shadow-sm",
                                hasReacted
                                  ? "bg-indigo-50/70 border-indigo-200 text-indigo-700 font-extrabold"
                                  : "bg-white border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-700"
                              )}
                            >
                              <span>{emoji}</span>
                              {list.length > 0 && <span>{list.length}</span>}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description={userRole === 'admin' ? 'Post your first announcement to keep everyone informed.' : 'No announcements have been posted yet.'}
              actionLabel={userRole === 'admin' ? 'Post Announcement' : undefined}
              onAction={userRole === 'admin' ? () => setShowAnnouncementForm(true) : undefined}
            />
          )}
        </div>

        {/* Right Column: Dynamic Activity & Workspace Sidebar */}
        <div className="space-y-6">
          
          {/* Circle Overview Statistics widget */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm relative overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Workspace Info
            </h3>
            
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Invitation Status</span>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold border-emerald-150">Active</Badge>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Total Updates</span>
                <span className="font-bold text-slate-800">{announcements.length} Posts</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Created Date</span>
                <span className="font-bold text-slate-800">{formatDate(circle.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Recent Live Circle Activity Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Activity className="w-4 h-4 text-indigo-600" />
              Recent Updates
            </h3>
            
            {loadingActivities ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Loading activity log...</span>
              </div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-slate-450 py-3 italic text-center">No recent file uploads or notes updates.</p>
            ) : (
              <div className="relative border-l border-slate-100 pl-4 ml-1.5 space-y-4 pt-1">
                {activities.map((act) => (
                  <div key={act.id} className="relative group text-xs">
                    {/* Timeline circle dot */}
                    <span 
                      className="absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white transition-all group-hover:scale-110 duration-200"
                      style={{ backgroundColor: color }}
                    />
                    
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {formatDistanceToNow(act.time, { addSuffix: true })}
                      </span>
                      <p className="text-slate-700 font-bold truncate group-hover:text-indigo-600 transition-colors">
                        {act.title}
                      </p>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                        {act.type === 'file' ? `📁 Uploaded File (${act.meta || 'file'})` : '📝 Updated Note'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
}
