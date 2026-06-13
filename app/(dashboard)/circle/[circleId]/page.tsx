'use client';

import { use, useState } from 'react';
import { useCircle } from '@/lib/hooks/useCircle';
import { Copy, Check, Megaphone, Plus, Activity } from 'lucide-react';
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

export default function CircleHomePage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = use(params);
  const { circle, announcements, loading, userRole, createAnnouncement } = useCircle(circleId);
  const [copied, setCopied] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [posting, setPosting] = useState(false);

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
      await createAnnouncement(announcementTitle.trim(), announcementBody.trim());
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setShowAnnouncementForm(false);
      toast.success('Announcement posted!');
    } catch {
      toast.error('Failed to post announcement');
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
            />
            <Textarea
              placeholder="What would you like to announce?"
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAnnouncementForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePostAnnouncement} disabled={posting}>
                {posting ? 'Posting...' : 'Post Announcement'}
              </Button>
            </div>
          </div>
        )}

        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-start gap-3">
                  <UserAvatar name={a.author?.full_name || 'User'} avatarUrl={a.author?.avatar_url} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{a.author?.full_name || 'User'}</span>
                      <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 mt-1">{a.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{a.body}</p>
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
