'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useCircle } from '@/lib/hooks/useCircle';
import { useChat } from '@/lib/hooks/useChat';

import { UserAvatar } from '@/components/shared/UserAvatar';
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  Paperclip, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Smile, 
  X, 
  Search, 
  Maximize2, 
  FileText, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function ChatPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = createClient();

  const { circle, loading: loadingCircle, currentUserId } = useCircle(circleId);
  const { messages, loading: loadingChat, sendMessage } = useChat(circleId);
  const [typedMessage, setTypedMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Attachments State
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);

  // GIF Search Popover State
  const [gifOpen, setGifOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load trending GIFs when popup is opened
  useEffect(() => {
    if (gifOpen && gifs.length === 0) {
      fetchGifs('');
    }
  }, [gifOpen]);

  // Search GIFs with debounce
  useEffect(() => {
    if (!gifOpen) return;
    const delayDebounce = setTimeout(() => {
      fetchGifs(gifSearch);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [gifSearch]);

  const fetchGifs = async (query: string) => {
    setLoadingGifs(true);
    try {
      const apiKey = 'dc6zaTOxFJmzC'; // Public beta key
      const url = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=15`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=15`;
      
      const res = await fetch(url);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Failed to load GIFs:', err);
    } finally {
      setLoadingGifs(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size exceeds the 100MB limit');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get signed upload URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circleId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { signedUrl, filePath } = await response.json();

      // 2. Upload file directly via PUT
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      // 3. Get Public URL
      const publicUrl = supabase.storage.from('circle-files').getPublicUrl(filePath).data.publicUrl;

      // Add to attachments array
      setAttachments(prev => [
        ...prev,
        {
          url: publicUrl,
          name: file.name,
          type: file.type,
          size: file.size
        }
      ]);
      toast.success(`${file.name} uploaded successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!typedMessage.trim() && attachments.length === 0) || sending || uploading) return;

    setSending(true);
    try {
      await sendMessage(typedMessage, attachments);
      setTypedMessage('');
      setAttachments([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter') {
      dragCounterRef.current++;
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Paste handler for files (screenshots/memes)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files[0]) {
      uploadFile(e.clipboardData.files[0]);
    }
  };

  // Instant GIF Selection Send
  const handleSendGif = async (gifUrl: string) => {
    setGifOpen(false);
    try {
      await sendMessage('', [{
        url: gifUrl,
        name: 'giphy.gif',
        type: 'image/gif'
      }]);
    } catch (err) {
      console.error(err);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return VideoIcon;
    return FileText;
  };

  if (loadingCircle || !circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading workspace chat...</span>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 h-[calc(100vh-190px)] flex flex-col relative select-none"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Active Overlay */}
      {dragActive && (
        <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[2px] border-2 border-dashed border-indigo-600 rounded-2xl flex flex-col items-center justify-center gap-2 z-55 pointer-events-none transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-indigo-600/20 text-indigo-600 animate-bounce">
            <Paperclip className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-indigo-950">Drop files here to upload to chat</p>
          <p className="text-xs text-slate-500 font-semibold">Supports photos, video, memes, and folders</p>
        </div>
      )}

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
                This is a secure, real-time message room for all members in this circle. Send a message or upload photos, videos and memes!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isSelf = msg.sender_id === currentUserId;
                const hasAttachments = msg.attachments && msg.attachments.length > 0;
                
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
                    <div className="space-y-1 w-full">
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
                      
                      <div className="space-y-2">
                        {/* Text Content */}
                        {msg.body && (
                          <div 
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-sm",
                              isSelf 
                                ? "bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-600/10" 
                                : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                            )}
                          >
                            {msg.body}
                          </div>
                        )}

                        {/* Attachments Rendering */}
                        {hasAttachments && (
                          <div className="space-y-1.5 mt-1 select-text">
                            {msg.attachments?.map((att, index) => {
                              const isImage = att.type?.startsWith('image/');
                              const isVideo = att.type?.startsWith('video/');

                              if (isImage) {
                                return (
                                  <div 
                                    key={index} 
                                    className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-100 max-w-[280px] bg-slate-100 cursor-pointer"
                                    onClick={() => setLightboxUrl(att.url)}
                                  >
                                    <img 
                                      src={att.url} 
                                      alt={att.name || 'Image'} 
                                      className="max-h-[200px] w-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                      <Maximize2 className="w-5 h-5 text-white" />
                                    </div>
                                  </div>
                                );
                              }

                              if (isVideo) {
                                return (
                                  <div key={index} className="rounded-xl overflow-hidden shadow-sm border border-slate-100 max-w-[320px] bg-black">
                                    <video 
                                      src={att.url} 
                                      controls 
                                      className="w-full max-h-[220px]"
                                    />
                                  </div>
                                );
                              }

                              // Generic file download card
                              return (
                                <a 
                                  key={index} 
                                  href={att.url} 
                                  download={att.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border text-xs font-semibold gap-3 hover:bg-slate-50 transition-colors shadow-sm",
                                    isSelf ? "bg-indigo-50/50 border-indigo-100 text-indigo-950" : "bg-white border-slate-100 text-slate-800"
                                  )}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                                    <span className="truncate max-w-[150px]">{att.name || 'attachment'}</span>
                                  </div>
                                  <Download className="w-4 h-4 text-slate-400 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        )}
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
        <div className="border-t border-slate-100 bg-white p-3 space-y-3 relative shrink-0">
          
          {/* Upload Progress Bar */}
          {uploading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Files Selected / Uploading Preview Bar */}
          {(attachments.length > 0 || uploading) && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl max-h-[100px] overflow-y-auto">
              {attachments.map((att, idx) => {
                const Icon = getFileIcon(att.type);
                const isImg = att.type?.startsWith('image/');
                
                return (
                  <div key={idx} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm text-xs font-bold text-slate-700 shrink-0">
                    {isImg ? (
                      <img src={att.url} className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    <span className="max-w-[120px] truncate">{att.name}</span>
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-red-500 p-0.5 hover:bg-slate-50 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {uploading && (
                <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 shrink-0 animate-pulse">
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Uploading file ({uploadProgress}%)...</span>
                </div>
              )}
            </div>
          )}

          {/* Chat Tool Actions & Input Form */}
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            
            {/* Attachment Button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loadingChat || uploading || sending}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 h-9 w-9 border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-indigo-600 rounded-xl"
              title="Upload photo, video or file"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </Button>

            {/* GIPHY / Meme Button */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loadingChat || uploading || sending}
                onClick={() => setGifOpen(!gifOpen)}
                className={cn(
                  "shrink-0 h-9 w-9 border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl",
                  gifOpen && "bg-indigo-50 border-indigo-200 text-indigo-600"
                )}
                title="Search and share GIFs/memes"
              >
                <Smile className="w-4.5 h-4.5" />
              </Button>

              {/* GIF Search Popup Panel */}
              {gifOpen && (
                <div className="absolute bottom-11 left-0 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 space-y-3 animate-slideIn">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Share GIF / Meme</span>
                    <button 
                      type="button" 
                      onClick={() => setGifOpen(false)}
                      className="text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input 
                      placeholder="Search Giphy..."
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                      className="pl-8 text-[11px] h-8 focus:ring-0 focus:border-slate-200 rounded-lg"
                      autoFocus
                    />
                  </div>

                  <div className="h-44 overflow-y-auto scrollbar-none">
                    {loadingGifs ? (
                      <div className="flex items-center justify-center h-full text-slate-400 gap-1.5">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-[10px] font-semibold">Giphy matching...</span>
                      </div>
                    ) : gifs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-1">
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                        <span className="text-[10px] font-semibold">No GIFs matching search</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {gifs.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => handleSendGif(g.images.fixed_height.url)}
                            className="h-14 w-full rounded-lg overflow-hidden border border-slate-100 bg-slate-50 hover:opacity-85 transition-opacity"
                          >
                            <img 
                              src={g.images.fixed_height_small.url} 
                              alt="GIF"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message Input Box */}
            <Input
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onPaste={handlePaste}
              placeholder="Type a message or drag/paste media..."
              disabled={loadingChat || sending}
              className="flex-1 text-xs h-9 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-xl"
              autoComplete="off"
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="icon"
              disabled={(!typedMessage.trim() && attachments.length === 0) || sending || uploading}
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

      {/* Full Screen Image Lightbox */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] animate-fadeIn cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxUrl} 
            alt="Lightbox fullscreen" 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-scaleUp select-text"
          />
        </div>
      )}
    </div>
  );
}
