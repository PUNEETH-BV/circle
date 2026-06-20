'use client';

import { useState } from 'react';
import { useNoteComments } from '@/lib/hooks/useNoteComments';
import { MessageSquare, X, Send, Trash2, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils/formatDate';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface NoteCommentsDrawerProps {
  noteId: string;
  onClose: () => void;
}

export function NoteCommentsDrawer({ noteId, onClose }: NoteCommentsDrawerProps) {
  const { comments, loading, addComment, deleteComment, refreshComments } = useNoteComments(noteId);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  
  // Get currently logged-in user to check deletion permissions
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSending(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-80 bg-slate-50 flex flex-col h-full overflow-hidden animate-slideIn select-none border-l border-slate-100">
      
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200/60 bg-white flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-bold text-slate-955">Document Discussion</h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={refreshComments}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Refresh comments"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-605 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 select-text">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-1">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-350" />
            <p className="text-xs font-medium">No comments yet</p>
            <p className="text-[10px] text-slate-400 max-w-[180px] mx-auto leading-normal">Start the conversation by posting a note or question below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const isAuthor = comment.author_id === currentUserId;
              return (
                <div key={comment.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1.5 group relative hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                        {comment.author?.full_name ? comment.author.full_name[0] : <User className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-[120px]">
                        {comment.author?.full_name || 'Member'}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold select-none">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed font-medium break-words">
                    {comment.body}
                  </p>
                  
                  {isAuthor && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="absolute right-2 bottom-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-50 cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Composer */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={sending}
          className="text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all h-9 flex-1"
        />
        <Button 
          type="submit" 
          disabled={sending || !newComment.trim()} 
          size="icon" 
          className="rounded-xl h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm"
        >
          {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </form>

    </div>
  );
}
