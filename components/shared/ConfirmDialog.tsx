'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex gap-4">
          {variant === 'danger' && (
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-slate-500 text-sm mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
