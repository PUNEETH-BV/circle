'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  RefreshCw,
  FileText,
  Clock,
  MessageSquare,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  CheckSquare,
  Grid,
  Image as ImageIcon,
  Palette,
  Highlighter,
  Printer,
  ChevronDown,
  Trash2,
  Plus,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useNoteVersions, NoteVersion } from '@/lib/hooks/useNoteVersions';
import { NoteCommentsDrawer } from './NoteCommentsDrawer';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';

// Define custom Font Size extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    } as any;
  },
});

interface NoteEditorProps {
  initialTitle: string;
  initialContent: any;
  onSave: (title: string, content: any) => Promise<void>;
  onBack: () => void;
  currentUserProfile?: any;
}

export function NoteEditor({
  initialTitle,
  initialContent,
  onSave,
  onBack,
  currentUserProfile,
}: NoteEditorProps) {
  const params = useParams();
  const noteId = params.noteId as string;
  const circleId = params.circleId as string;
  const supabase = createClient();

  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Collaboration Presence State
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Toolbar Dropdown states
  const [fontOpen, setFontOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [tableGridOpen, setTableGridOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Table Hover Grid state
  const [hoverGrid, setHoverGrid] = useState({ rows: 1, cols: 1 });

  // Unified Sidebar Tab State: 'ai' | 'history' | 'comments' | null
  const [activeSidebarTab, setActiveSidebarTab] = useState<'ai' | 'history' | 'comments' | null>(null);

  // AI Summary Drawer State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note revisions hook
  const { versions, loading: loadingVersions, saveVersion } = useNoteVersions(noteId);

  // References to keep track of current states for debouncing and unmount-saving
  const titleRef = useRef(title);
  const contentRef = useRef(initialContent);
  const saveStatusRef = useRef(saveStatus);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Supabase Collaboration Presence Channel Setup
  useEffect(() => {
    if (!currentUserProfile || !noteId) return;

    const channel = supabase.channel(`note-collab-${noteId}`, {
      config: {
        presence: {
          key: currentUserProfile.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers = Object.values(state).flatMap((users: any) => users[0]);
        setCollaborators(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUserProfile.id,
            full_name: currentUserProfile.full_name,
            avatar_url: currentUserProfile.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [noteId, currentUserProfile]);

  // Configure Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-xl shadow-md my-6 mx-auto block outline-none border-2 border-transparent hover:border-indigo-500 transition-all cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-650 underline cursor-pointer hover:text-indigo-800 transition-colors',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your Google Doc here...',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getJSON();
      setSaveStatus('dirty');
    },
  });

  // Warn before browser reload/close if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatusRef.current === 'dirty') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Update saveStatus reference
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  // Debounced auto-save (triggered when title or editor content changes)
  useEffect(() => {
    if (saveStatus !== 'dirty') return;

    const timer = setTimeout(async () => {
      await saveNote();
    }, 2500); // Save 2.5 seconds after typing stops

    return () => clearTimeout(timer);
  }, [title, saveStatus]);

  // Monitor editor updates to trigger dirty state
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      setSaveStatus('dirty');
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Trigger save when component unmounts to prevent data loss
  useEffect(() => {
    return () => {
      if (saveStatusRef.current === 'dirty') {
        onSaveRef.current(titleRef.current, contentRef.current).catch((err) => {
          console.error('Failed to save on unmount:', err);
        });
      }
    };
  }, []);

  async function saveNote() {
    setSaveStatus('saving');
    try {
      await onSaveRef.current(titleRef.current, contentRef.current);
      setSaveStatus('saved');
      setLastSavedTime(new Date());

      // Save a revision snapshot version in the database
      await saveVersion(titleRef.current, contentRef.current);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaveStatus('dirty');
  };

  const handleGenerateSummary = async () => {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim() || text.length < 20) {
      toast.error('Write a bit more in the note first (at least 20 characters) so the AI can summarize it.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiSummary('');
    setActiveSidebarTab('ai');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'summarize',
          text: text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setAiSummary(data.result);
      toast.success('AI Note Summary generated!');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'AI summarization failed');
      toast.error('AI Summary failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleRestoreVersion = (ver: NoteVersion) => {
    const confirm = window.confirm("Are you sure you want to restore the note to this version? Unsaved changes in your current editor will be overwritten.");
    if (!confirm) return;

    setTitle(ver.title);
    if (editor) {
      editor.commands.setContent(ver.content);
    }
    setSaveStatus('dirty');
    toast.success('Note content restored! Auto-save will backup this state.');
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Get live counts from text content
  const docText = editor.getText() || '';
  const wordCount = docText.trim() ? docText.trim().split(/\s+/).length : 0;
  const charCount = docText.length;

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        toast.error('Image exceeds 15MB limit');
        return;
      }
      
      const uploadToast = toast.loading('Uploading image into document...');
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            circleId,
            fileName: file.name,
            fileType: file.type || 'image/jpeg',
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch upload parameters');
        const { signedUrl, filePath } = await response.json();

        // Direct upload to Supabase storage
        await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'image/jpeg' },
          body: file,
        });

        const publicUrl = supabase.storage.from('circle-files').getPublicUrl(filePath).data.publicUrl;
        
        editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
        toast.dismiss(uploadToast);
        toast.success('Image inserted');
      } catch (err: any) {
        toast.dismiss(uploadToast);
        toast.error('Image upload failed: ' + err.message);
      }
    }
  };

  const insertImageByUrl = () => {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
      setImageUrl('');
      setImageOpen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Predefined Toolbar Constants
  const fontFamilies = [
    { label: 'Inter (Default)', value: 'Inter' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Courier Prime', value: 'Courier New' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS' }
  ];

  const fontSizes = [
    { label: '10 pt', value: '10px' },
    { label: '12 pt', value: '12px' },
    { label: '14 pt', value: '14px' },
    { label: '16 pt', value: '16px' },
    { label: '18 pt', value: '18px' },
    { label: '24 pt', value: '24px' },
    { label: '32 pt', value: '32px' },
    { label: '48 pt', value: '48px' }
  ];

  const colors = [
    { name: 'Black', value: '#0f172a' },
    { name: 'Gray', value: '#64748b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' }
  ];

  const highlights = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Pink', value: '#fbcfe8' },
    { name: 'Purple', value: '#e9d5ff' },
    { name: 'Orange', value: '#fed7aa' }
  ];

  // Helper to increase / decrease font size
  const adjustFontSize = (change: 'increase' | 'decrease') => {
    const currentSizeAttr = editor.getAttributes('textStyle').fontSize || '16px';
    const num = parseInt(currentSizeAttr);
    const newNum = change === 'increase' ? num + 2 : Math.max(num - 2, 8);
    (editor.commands as any).setFontSize(`${newNum}px`);
  };

  const handleTableGridClick = (r: number, c: number) => {
    editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
    setTableGridOpen(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex h-full bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-col">
      {/* Tiptap embedded CSS overrides for styling page layout and custom elements */}
      <style>{`
        .ProseMirror {
          min-height: 980px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5rem 0;
          overflow: hidden;
        }
        .ProseMirror td, .ProseMirror th {
          min-width: 1em;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          background-color: #f8fafc;
          font-weight: bold;
          text-align: left;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
          margin: 1rem 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
          margin-top: 0.25rem;
          cursor: pointer;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
        }
      `}</style>
      
      {/* Document Title & Save Status Topbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to Notes" className="rounded-lg hover:bg-slate-50 shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>

          {/* Doc Title Input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Document"
            className="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 font-bold text-slate-800 text-lg outline-none pb-0.5 max-w-[280px] sm:max-w-md transition-colors"
          />

          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-slate-500 font-semibold select-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {lastSavedTime ? `Saved at ${formatTime(lastSavedTime)}` : 'Saved'}
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-slate-500 font-semibold select-none">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
                Saving...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold animate-pulse select-none">
                <AlertCircle className="w-4 h-4" />
                Unsaved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse select-none">
                <AlertCircle className="w-4 h-4" />
                Failed to save
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Collaborators Avatars */}
          {collaborators.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-4 select-none">
              {collaborators.map((user) => (
                <div 
                  key={user.id} 
                  className="rounded-full ring-2 ring-white"
                  title={`${user.full_name} is viewing this document`}
                >
                  <UserAvatar 
                    name={user.full_name} 
                    avatarUrl={user.avatar_url} 
                    size="sm" 
                  />
                </div>
              ))}
            </div>
          )}

          {/* Drawer Toggles */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSidebarTab(prev => prev === 'comments' ? null : 'comments')}
            className={cn(
              "border-slate-200 gap-1.5 h-8.5 text-xs rounded-lg font-bold shadow-sm",
              activeSidebarTab === 'comments' ? "bg-indigo-50 border-indigo-200 text-indigo-750 hover:bg-indigo-100" : "text-slate-700 bg-white hover:bg-slate-50"
            )}
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">Comments</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSidebarTab(prev => prev === 'history' ? null : 'history')}
            className={cn(
              "border-slate-200 gap-1.5 h-8.5 text-xs rounded-lg font-bold shadow-sm",
              activeSidebarTab === 'history' ? "bg-indigo-50 border-indigo-200 text-indigo-750 hover:bg-indigo-100" : "text-slate-700 bg-white hover:bg-slate-50"
            )}
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">History</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeSidebarTab === 'ai') {
                setActiveSidebarTab(null);
              } else {
                handleGenerateSummary();
              }
            }}
            disabled={aiLoading}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-150 gap-1.5 h-8.5 text-xs rounded-lg font-bold shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-500/10" />
            <span>AI Summarize</span>
          </Button>
        </div>
      </div>

      {/* Google Docs Advanced Styling Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0 select-none">
        
        {/* Undo / Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-35 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-35 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Font Family Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFontOpen(!fontOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-750"
            title="Font Family"
          >
            <span className="truncate max-w-[90px]">
              {fontFamilies.find(f => editor.isActive('fontFamily', { fontFamily: f.value }))?.label || 'Font'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </button>
          
          {fontOpen && (
            <div className="absolute top-8.5 left-0 z-50 w-44 bg-white border border-slate-200 rounded-lg shadow-xl py-1 animate-slideIn">
              {fontFamilies.map(font => (
                <button
                  key={font.value}
                  onClick={() => {
                    editor.chain().focus().setFontFamily(font.value).run();
                    setFontOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors font-medium text-slate-750",
                    editor.isActive('fontFamily', { fontFamily: font.value }) && "bg-indigo-50 text-indigo-700 font-bold"
                  )}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Font Size Adjusters */}
        <div className="flex items-center border border-slate-200 rounded bg-white overflow-hidden">
          <button
            onClick={() => adjustFontSize('decrease')}
            className="px-2 py-1.5 hover:bg-slate-50 text-slate-700 font-bold text-xs border-r border-slate-100"
            title="Decrease Font Size"
          >
            -
          </button>
          
          {/* Size Label */}
          <div className="relative">
            <button
              onClick={() => setFontSizeOpen(!fontSizeOpen)}
              className="px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-750 flex items-center gap-1"
            >
              <span>{editor.getAttributes('textStyle').fontSize || '16px'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {fontSizeOpen && (
              <div className="absolute top-8 left-0 z-50 w-24 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-center animate-slideIn">
                {fontSizes.map(sz => (
                  <button
                    key={sz.value}
                    onClick={() => {
                      (editor.commands as any).setFontSize(sz.value);
                      setFontSizeOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 text-xs hover:bg-slate-50 font-medium block transition-colors",
                      editor.getAttributes('textStyle').fontSize === sz.value && "bg-indigo-50 text-indigo-700 font-bold"
                    )}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => adjustFontSize('increase')}
            className="px-2 py-1.5 hover:bg-slate-50 text-slate-700 font-bold text-xs border-l border-slate-100"
            title="Increase Font Size"
          >
            +
          </button>
        </div>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Standard Formats: Bold, Italic, Underline */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('bold') && 'bg-slate-200 text-indigo-700')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('italic') && 'bg-slate-200 text-indigo-700')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('underline') && 'bg-slate-200 text-indigo-700')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Color Palette (Text Color) */}
        <div className="relative">
          <button
            onClick={() => setTextColorOpen(!textColorOpen)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-750 flex items-center gap-0.5"
            title="Text Color"
          >
            <Palette className="w-4 h-4 text-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full border border-slate-350" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }} />
          </button>
          
          {textColorOpen && (
            <div className="absolute top-8.5 left-0 z-50 bg-white border border-slate-200 p-2.5 rounded-lg shadow-xl grid grid-cols-5 gap-1.5 w-40 animate-slideIn">
              {colors.map(col => (
                <button
                  key={col.value}
                  onClick={() => {
                    editor.chain().focus().setColor(col.value).run();
                    setTextColorOpen(false);
                  }}
                  className="w-5.5 h-5.5 rounded-full border border-slate-200 hover:scale-105 active:scale-95 transition-all"
                  style={{ backgroundColor: col.value }}
                  title={col.name}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setTextColorOpen(false);
                }}
                className="col-span-5 text-[9px] font-bold text-center border rounded py-1 hover:bg-slate-50 text-slate-500 mt-1"
              >
                Reset Color
              </button>
            </div>
          )}
        </div>

        {/* Highlighter (Background Color) */}
        <div className="relative">
          <button
            onClick={() => setHighlightColorOpen(!highlightColorOpen)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-750 flex items-center gap-0.5"
            title="Highlight Color"
          >
            <Highlighter className="w-4 h-4 text-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full border border-slate-350" style={{ backgroundColor: editor.getAttributes('highlight').color || '#ffffff' }} />
          </button>

          {highlightColorOpen && (
            <div className="absolute top-8.5 left-0 z-50 bg-white border border-slate-200 p-2.5 rounded-lg shadow-xl grid grid-cols-3 gap-1.5 w-32 animate-slideIn">
              {highlights.map(hl => (
                <button
                  key={hl.value}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: hl.value }).run();
                    setHighlightColorOpen(false);
                  }}
                  className="h-5.5 rounded border border-slate-200 hover:scale-105 transition-all"
                  style={{ backgroundColor: hl.value }}
                  title={hl.name}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setHighlightColorOpen(false);
                }}
                className="col-span-3 text-[9px] font-bold text-center border rounded py-1 hover:bg-slate-50 text-slate-500 mt-1"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Alignment */}
        <div className="relative">
          <button
            onClick={() => setAlignOpen(!alignOpen)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 flex items-center gap-0.5"
            title="Text Alignment"
          >
            {editor.isActive({ textAlign: 'center' }) && <AlignCenter className="w-4 h-4" />}
            {editor.isActive({ textAlign: 'right' }) && <AlignRight className="w-4 h-4" />}
            {editor.isActive({ textAlign: 'justify' }) && <AlignJustify className="w-4 h-4" />}
            {!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' }) && <AlignLeft className="w-4 h-4" />}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          
          {alignOpen && (
            <div className="absolute top-8.5 left-0 z-50 bg-white border border-slate-200 rounded-lg p-1 shadow-xl flex gap-1 animate-slideIn">
              <button
                onClick={() => { editor.chain().focus().setTextAlign('left').run(); setAlignOpen(false); }}
                className={cn("p-1.5 rounded hover:bg-slate-100", !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' }) && "bg-slate-100 text-indigo-650")}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { editor.chain().focus().setTextAlign('center').run(); setAlignOpen(false); }}
                className={cn("p-1.5 rounded hover:bg-slate-100", editor.isActive({ textAlign: 'center' }) && "bg-slate-100 text-indigo-650")}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => { editor.chain().focus().setTextAlign('right').run(); setAlignOpen(false); }}
                className={cn("p-1.5 rounded hover:bg-slate-100", editor.isActive({ textAlign: 'right' }) && "bg-slate-100 text-indigo-650")}
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { editor.chain().focus().setTextAlign('justify').run(); setAlignOpen(false); }}
                className={cn("p-1.5 rounded hover:bg-slate-100", editor.isActive({ textAlign: 'justify' }) && "bg-slate-100 text-indigo-650")}
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Lists & Checkbox Tasklist */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('bulletList') && 'bg-slate-200 text-indigo-750')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('orderedList') && 'bg-slate-200 text-indigo-750')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('taskList') && 'bg-slate-200 text-indigo-750')}
          title="Checklist / Task List"
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Table Creation Grid Popover */}
        <div className="relative">
          <button
            onClick={() => setTableGridOpen(!tableGridOpen)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 flex items-center gap-0.5"
            title="Insert Table"
          >
            <Grid className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          
          {tableGridOpen && (
            <div className="absolute top-8.5 left-0 z-50 bg-white border border-slate-200 p-3.5 rounded-xl shadow-xl space-y-3.5 animate-slideIn">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Insert Table Grid</span>
              <div className="grid grid-cols-5 gap-1 select-none">
                {[1, 2, 3, 4, 5].map(r => (
                  <div key={r} className="contents">
                    {[1, 2, 3, 4, 5].map(c => {
                      const isHovered = r <= hoverGrid.rows && c <= hoverGrid.cols;
                      return (
                        <button
                          key={c}
                          type="button"
                          onMouseEnter={() => setHoverGrid({ rows: r, cols: c })}
                          onClick={() => handleTableGridClick(r, c)}
                          className={cn(
                            "w-5 h-5 border rounded transition-all",
                            isHovered ? "bg-indigo-500 border-indigo-600 scale-[1.05]" : "bg-slate-50 border-slate-200"
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-semibold text-center text-slate-500">
                {hoverGrid.rows} rows × {hoverGrid.cols} cols
              </div>
            </div>
          )}
        </div>

        {/* Image insertion tool */}
        <div className="relative">
          <button
            onClick={() => setImageOpen(!imageOpen)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
            title="Insert Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          
          {imageOpen && (
            <div className="absolute top-8.5 left-0 z-50 w-64 bg-white border border-slate-200 p-3.5 rounded-xl shadow-xl space-y-3 animate-slideIn">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Insert Image</span>
              
              {/* Local File Input */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 gap-1.5 text-xs font-bold border border-indigo-150 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload from Device</span>
              </Button>

              <div className="flex items-center gap-2 text-slate-400 select-none">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[9px] font-bold">OR</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* URL Input */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Paste Image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                />
                <Button
                  size="sm"
                  onClick={insertImageByUrl}
                  disabled={!imageUrl.trim()}
                  className="w-full text-xs font-bold h-8"
                >
                  Insert URL Link
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hyperlink, Blockquote, Divider */}
        <button
          onClick={toggleLink}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('link') && 'bg-slate-200 text-indigo-700')}
          title="Hyperlink"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('blockquote') && 'bg-slate-200 text-indigo-750')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-700"
          title="Horizontal Rule / Divider"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-250 mx-1.5" />

        {/* Export / Print */}
        <button
          onClick={handlePrint}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
          title="Print / Save as PDF"
        >
          <Printer className="w-4 h-4" />
        </button>

        <Button
          variant="outline"
          size="sm"
          disabled={saveStatus === 'saved' || saveStatus === 'saving'}
          onClick={saveNote}
          className="ml-auto h-7 px-2.5 text-[10px] rounded-lg border-slate-200 shadow-sm bg-white hover:bg-slate-50 font-bold"
        >
          Save Now
        </Button>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Body Wrapper */}
        <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col items-center py-6 px-4">
          
          {/* Floating Table Settings Panel (appears when cursor is inside a table) */}
          {editor.isActive('table') && (
            <div className="mb-4 bg-white border border-slate-200 shadow-lg px-3 py-1.5 rounded-full flex items-center gap-1 select-none animate-slideIn">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mr-2 border-r pr-2">Table Tool</span>
              <button 
                onClick={() => editor.chain().focus().addColumnBefore().run()} 
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Add Column Before"
              >
                <Plus className="w-3.5 h-3.5 inline mr-0.5" /><ChevronLeft className="w-3.5 h-3.5 inline -ml-1" />
              </button>
              <button 
                onClick={() => editor.chain().focus().addColumnAfter().run()} 
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Add Column After"
              >
                <ChevronRight className="w-3.5 h-3.5 inline" /><Plus className="w-3.5 h-3.5 inline -ml-1" />
              </button>
              <button 
                onClick={() => editor.chain().focus().addRowBefore().run()} 
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Add Row Above"
              >
                <Plus className="w-3.5 h-3.5 inline mr-0.5" /><ArrowUpToLine className="w-3.5 h-3.5 inline -ml-1" />
              </button>
              <button 
                onClick={() => editor.chain().focus().addRowAfter().run()} 
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Add Row Below"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 inline" /><Plus className="w-3.5 h-3.5 inline -ml-1" />
              </button>
              <div className="h-4 w-px bg-slate-250 mx-1" />
              <button 
                onClick={() => editor.chain().focus().deleteColumn().run()} 
                className="p-1 hover:bg-red-50 text-red-500 rounded"
                title="Delete Column"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => editor.chain().focus().deleteRow().run()} 
                className="p-1 hover:bg-red-50 text-red-500 rounded"
                title="Delete Row"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => editor.chain().focus().deleteTable().run()} 
                className="p-1 hover:bg-red-50 text-red-650 rounded ml-1 font-semibold text-[10px] flex items-center gap-0.5"
                title="Delete Table"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Table</span>
              </button>
            </div>
          )}

          {/* Centered White Google Doc Paper Sheet */}
          <div 
            id="print-area"
            className="w-full max-w-[816px] bg-white shadow-xl rounded-md border border-slate-200 p-16 md:p-20 min-h-[1056px] relative flex flex-col text-slate-800"
          >
            {/* Fake Page Ruler Guidelines */}
            <div className="absolute top-8 left-16 right-16 h-4 border-b border-dashed border-slate-200 pointer-events-none select-none flex justify-between items-end pb-0.5 text-[8px] font-bold text-slate-400">
              <span>0"</span>
              <span>1"</span>
              <span>2"</span>
              <span>3"</span>
              <span>4"</span>
              <span>5"</span>
              <span>6"</span>
            </div>

            {/* Document Content Canvas */}
            <EditorContent editor={editor} className="flex-1 prose max-w-none text-sm leading-relaxed" />
          </div>

          {/* Footer Document Stats */}
          <div className="w-full max-w-[816px] mt-4 flex justify-between text-[10px] font-bold text-slate-500 px-2 select-none">
            <span>Google Docs Layout (US Letter)</span>
            <div className="flex gap-4">
              <span>Words: {wordCount}</span>
              <span>Characters: {charCount}</span>
            </div>
          </div>
        </div>

        {/* Right side: Sidebar drawers */}
        {activeSidebarTab === 'ai' && (
          <div className="w-80 bg-slate-50 flex flex-col h-full overflow-hidden animate-slideIn select-none border-l border-slate-200">
            
            {/* AI Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-500/10" />
                <h3 className="text-xs font-bold text-slate-900">Gemini AI Assistant</h3>
              </div>
              <button
                onClick={() => setActiveSidebarTab(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="text-xs font-medium">Analyzing document...</span>
                </div>
              ) : aiError ? (
                <div className="p-4 rounded-xl border border-red-100 bg-red-50/50 text-red-700 space-y-3">
                  <div className="flex gap-2 items-start text-xs font-semibold">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                    <span>Failed to summarize note</span>
                  </div>
                  <p className="text-[10px] text-red-650 leading-relaxed">{aiError}</p>
                  <Button 
                    onClick={handleGenerateSummary}
                    size="sm" 
                    className="w-full bg-red-600 hover:bg-red-700 text-xs font-semibold rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry Summary
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 select-text">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest border-b border-slate-50 pb-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Structured Summary</span>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                      {aiSummary || 'No summary generated yet.'}
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateSummary}
                    variant="outline"
                    size="sm"
                    className="w-full border-slate-200 text-slate-650 gap-1.5 text-xs rounded-lg animate-pulse"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh Summary
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSidebarTab === 'history' && (
          <div className="w-80 bg-slate-50 flex flex-col h-full overflow-hidden animate-slideIn select-none border-l border-slate-200">
            
            {/* History Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-900">Revision History</h3>
              </div>
              <button
                onClick={() => setActiveSidebarTab(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* History Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50 text-[10px] text-indigo-700 leading-normal font-medium">
                💡 Edits trigger automatic revision snapshots. Click any card below to restore.
              </div>

              {loadingVersions ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold">Loading revisions...</span>
                </div>
              ) : versions.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-10 italic">No revisions backup yet.</p>
              ) : (
                <div className="space-y-2 select-text">
                  {versions.map((ver, idx) => (
                    <button
                      key={ver.id}
                      onClick={() => handleRestoreVersion(ver)}
                      className="w-full text-left p-3.5 bg-white hover:bg-indigo-50/30 rounded-xl border border-slate-200 hover:border-indigo-200/80 transition-all group flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between select-none">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-650 transition-colors truncate max-w-[130px]">
                          {ver.title || 'Untitled Note'}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded shrink-0">
                          v{versions.length - idx}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium">
                        Updated by {ver.author?.full_name || 'Member'}
                      </p>
                      <span className="text-[8px] text-slate-400 font-semibold mt-1">
                        {new Date(ver.created_at).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSidebarTab === 'comments' && (
          <NoteCommentsDrawer noteId={noteId} onClose={() => setActiveSidebarTab(null)} />
        )}

      </div>
    </div>
  );
}
