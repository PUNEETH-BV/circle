'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
  initialTitle: string;
  initialContent: any;
  onSave: (title: string, content: any) => Promise<void>;
  onBack: () => void;
}

export function NoteEditor({
  initialTitle,
  initialContent,
  onSave,
  onBack,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

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

  // Configure Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note here...',
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
    }, 2000); // Save 2 seconds after typing stops

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
        // Run a fire-and-forget save of the current ref values on unmount
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
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaveStatus('dirty');
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Helper for Link Prompt
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to Notes">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {lastSavedTime ? `Saved at ${formatTime(lastSavedTime)}` : 'Saved'}
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                Saving...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="flex items-center gap-1 text-amber-600 font-medium animate-pulse">
                <AlertCircle className="w-4 h-4" />
                Unsaved changes
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <AlertCircle className="w-4 h-4" />
                Failed to save
              </span>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={saveStatus === 'saved' || saveStatus === 'saving'}
          onClick={saveNote}
        >
          Save Now
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 flex-shrink-0 select-none">
        {/* Inline formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('bold') && 'bg-slate-200 text-indigo-600')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('italic') && 'bg-slate-200 text-indigo-600')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('underline') && 'bg-slate-200 text-indigo-600')}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('heading', { level: 1 }) && 'bg-slate-200 text-indigo-600')}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('heading', { level: 2 }) && 'bg-slate-200 text-indigo-600')}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('heading', { level: 3 }) && 'bg-slate-200 text-indigo-600')}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('bulletList') && 'bg-slate-200 text-indigo-600')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('orderedList') && 'bg-slate-200 text-indigo-600')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Blocks & Extras */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('blockquote') && 'bg-slate-200 text-indigo-600')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('codeBlock') && 'bg-slate-200 text-indigo-600')}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-700"
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={toggleLink}
          className={cn('p-1.5 rounded hover:bg-slate-200 transition-colors', editor.isActive('link') && 'bg-slate-200 text-indigo-600')}
          title="Hyperlink"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-8 prose max-w-none focus:outline-none">
        {/* Note Title Input */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled Note"
          className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-100 focus:border-slate-100 text-3xl font-semibold text-slate-900 placeholder:text-slate-300 outline-none pb-2 mb-6 transition-all"
        />

        {/* Editor Body */}
        <EditorContent editor={editor} className="min-h-[400px]" />
      </div>
    </div>
  );
}
