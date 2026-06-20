'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useCircle } from '@/lib/hooks/useCircle';
import { useChat } from '@/lib/hooks/useChat';
import { CircleTabNav } from '@/components/circle/CircleTabNav';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const params = useParams();
  const circleId = params.circleId as string;

  const { circle, loading: loadingCircle, userRole, currentUserId } = useCircle(circleId);
  const { messages, loading: loadingChat, sendMessage } = useChat(circleId);
  const [typedMessage, setTypedMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(typedMessage);
      setTypedMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loadingCircle || !circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading workspace chat...</span>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="shrink-0">
        <CircleTabNav circleId={circleId} circleName={circle.name} isAdmin={isAdmin} />
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-0">
        
        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/30">
          {loadingChat ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Connecting to stream...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">Welcome to #{circle.name} chat!</p>
              <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                This is a secure, real-time message room for all members in this circle. Send a message to start conversing!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isSelf = msg.sender_id === currentUserId;
                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex gap-3 max-w-[85%] md:max-w-[70%] items-start animate-fadeIn",
                      isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    {!isSelf && (
                      <UserAvatar 
                        name={msg.sender?.full_name || 'User'} 
                        avatarUrl={msg.sender?.avatar_url} 
                        size="sm" 
                        className="shrink-0 mt-0.5"
                      />
                    )}
                    <div className="space-y-1">
                      {!isSelf && (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[10px] font-bold text-slate-700">
                            {msg.sender?.full_name || 'User'}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      
                      <div 
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-wrap",
                          isSelf 
                            ? "bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-600/10" 
                            : "bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm"
                        )}
                      >
                        {msg.body}
                      </div>
                      
                      {isSelf && (
                        <span className="text-[8px] text-slate-400 block text-right px-1 mt-0.5">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Message Area */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2 shrink-0">
          <Input
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder="Type a message to the group..."
            disabled={loadingChat || sending}
            className="flex-1 text-xs h-9 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-xl"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!typedMessage.trim() || sending}
            className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-9 w-9 rounded-xl shadow-md shadow-indigo-600/10"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </Button>
        </form>

      </div>
    </div>
  );
}
