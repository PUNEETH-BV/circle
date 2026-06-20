'use client';

import { useState } from 'react';
import { useComments } from '@/lib/hooks/useComments';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Send, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface AnnouncementCommentsProps {
  announcementId: string;
  currentUserId: string | null;
}

export function AnnouncementComments({ announcementId, currentUserId }: AnnouncementCommentsProps) {
  const { comments, loading, addComment, deleteComment } = useComments(announcementId);
  const [typedComment, setTypedComment] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedComment.trim() || posting) return;

    setPosting(true);
    try {
      await addComment(typedComment);
      setTypedComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-fadeIn">
      <div className="flex items-center gap-1.5 px-1 select-none">
        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discussion Thread</span>
      </div>

      {/* Comments List */}
      <div className="space-y-3 pl-1 max-h-60 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic py-2 pl-2">No comments posted yet. Be the first to start the discussion!</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5 items-start text-xs group animate-fadeIn">
                <UserAvatar 
                  name={comment.author?.full_name || 'User'} 
                  avatarUrl={comment.author?.avatar_url} 
                  size="sm" 
                  className="shrink-0 mt-0.5"
                />
                <div className="flex-1 bg-slate-50/70 hover:bg-slate-50 rounded-xl p-2.5 border border-slate-100/50 relative">
                  <div className="flex items-center justify-between gap-2 select-none">
                    <span className="font-bold text-[10px] text-slate-700">
                      {comment.author?.full_name || 'User'}
                    </span>
                    <span className="text-[8px] text-slate-400">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-slate-650 mt-1 leading-normal font-medium whitespace-pre-wrap">{comment.body}</p>
                  
                  {comment.author_id === currentUserId && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="absolute right-2.5 bottom-2.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5 rounded cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={handlePostComment} className="flex gap-2 items-center bg-slate-50 border border-slate-100 rounded-xl p-1.5">
        <Input 
          value={typedComment}
          onChange={(e) => setTypedComment(e.target.value)}
          placeholder="Write a comment..."
          disabled={loading || posting}
          className="flex-1 text-[11px] h-8 bg-transparent border-0 focus:ring-0 rounded-none shadow-none pl-2"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!typedComment.trim() || posting}
          className="bg-indigo-600 hover:bg-indigo-700 h-8 w-8 rounded-lg shrink-0 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          {posting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <Send className="w-3.5 h-3.5 text-white" />
          )}
        </Button>
      </form>
    </div>
  );
}
