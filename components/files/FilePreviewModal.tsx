'use client';

import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils/formatFileSize';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FileRecord } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf components to prevent SSR errors
const Document = dynamic(
  () => import('react-pdf').then((m) => m.Document),
  { ssr: false, loading: () => <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> }
);
const Page = dynamic(
  () => import('react-pdf').then((m) => m.Page),
  { ssr: false }
);

interface FilePreviewModalProps {
  file: FileRecord | null;
  onClose: () => void;
  onDownload: (file: FileRecord) => void;
}

export function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const supabase = getSupabaseBrowserClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  
  // PDF State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(true);

  useEffect(() => {
    // Configure pdfjs worker dynamically
    const setupPdfWorker = async () => {
      const pdfjs = await import('react-pdf').then((m) => m.pdfjs);
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    };
    if (file?.file_type === 'application/pdf') {
      setupPdfWorker();
    }
  }, [file]);

  useEffect(() => {
    if (!file) {
      setSignedUrl(null);
      setNumPages(null);
      setPageNumber(1);
      setZoom(1.0);
      return;
    }

    const filePath = file.file_path;

    async function getUrl() {
      setLoadingUrl(true);
      try {
        const { data, error } = await supabase.storage
          .from('circle-files')
          .createSignedUrl(filePath, 300); // 5 mins URL
        
        if (error) throw error;
        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        console.error('Failed to generate preview URL:', err);
      } finally {
        setLoadingUrl(false);
      }
    }

    getUrl();
  }, [file]);

  if (!file) return null;

  const isImage = file.file_type.startsWith('image/');
  const isPdf = file.file_type === 'application/pdf';

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl flex flex-col w-[90vw] h-[85vh] max-w-5xl z-10 overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate" title={file.name}>
              {file.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFileSize(file.file_size)} • {file.file_type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {signedUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(signedUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open Original</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onDownload(file)}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-50 overflow-auto flex items-center justify-center p-4">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-sm">Generating secure preview...</span>
            </div>
          ) : !signedUrl ? (
            <div className="text-slate-500 text-sm">Failed to load preview URL.</div>
          ) : isImage ? (
            <img
              src={signedUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm bg-white"
            />
          ) : isPdf ? (
            <div className="flex flex-col items-center w-full h-full overflow-auto py-2">
              <Document
                file={signedUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={() => setPdfLoading(false)}
                className="flex justify-center max-w-full"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={zoom}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  className="shadow-md rounded-lg max-w-full bg-white"
                />
              </Document>
              
              {pdfLoading && (
                <div className="absolute inset-0 bg-slate-50/80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-8 max-w-sm bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <X className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">No Preview Available</h4>
              <p className="text-xs text-slate-500 mb-4">
                Previews are only supported for images and PDFs. Download the file to view its contents.
              </p>
              <Button size="sm" onClick={() => onDownload(file)}>
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* PDF Bottom Controls */}
        {isPdf && !loadingUrl && signedUrl && numPages && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium text-slate-700 select-none">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={zoom <= 0.5}
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[3rem] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={zoom >= 2.5}
                onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
