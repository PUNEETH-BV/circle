'use client';

import { useState } from 'react';
import { useCircle } from '@/lib/hooks/useCircle';
import { Copy, Check, Megaphone, Plus, Activity, Paperclip, X, Film, Loader2 } from 'lucide-react';
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

export default function CircleHomePage({ params }: { params: { circleId: string } }) {
  const { circleId } = params;
  const { circle, announcements, loading, userRole, createAnnouncement } = useCircle(circleId);
  const [copied, setCopied] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
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
    <div className="space-y-8">
      {/* Circle header */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {getInitials(circle.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">{circle.name}</h2>
            {circle.description && (
              <p className="text-slate-500 text-sm mt-1">{circle.description}</p>
            )}
          </div>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition-colors self-start"
          >
            <span className="font-mono text-xs">{circle.invite_code}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Announcements
          </h3>
          {userRole === 'admin' && (
            <Button size="sm" onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}>
              <Plus className="w-4 h-4 mr-1" />
              Post
            </Button>
          )}
        </div>

        {showAnnouncementForm && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4 space-y-3">
            <Input
              placeholder="Announcement title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              disabled={posting}
            />
            <Textarea
              placeholder="What would you like to announce?"
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              rows={3}
              disabled={posting}
            />

            {/* Thumbnail previews */}
            {mediaFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {mediaFiles.map((file, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
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
                      className="absolute top-1 right-1 w-4 h-4 bg-slate-900/60 rounded-full flex items-center justify-center text-white hover:bg-slate-900 transition-colors"
                      disabled={posting}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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
                  disabled={posting}
                  className="text-slate-500 gap-1.5 h-8 text-xs"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach Photos/Videos</span>
                </Button>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => {
                  setShowAnnouncementForm(false);
                  setMediaFiles([]);
                }} disabled={posting} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handlePostAnnouncement} disabled={posting} className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs">
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

        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-start gap-3">
                  <UserAvatar name={a.author?.full_name || 'User'} avatarUrl={a.author?.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{a.author?.full_name || 'User'}</span>
                      <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 mt-1 text-sm">{a.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed break-words">{a.body}</p>

                    {/* Announcement Media Attachments */}
                    {a.media && Array.isArray(a.media) && a.media.length > 0 && (
                      <div className={cn(
                        "mt-3 gap-2 grid",
                        a.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                      )}>
                        {a.media.map((item: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50 max-h-60 flex items-center justify-center"
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
    </div>
  );
}
