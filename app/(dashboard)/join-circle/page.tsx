'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { toast } from 'sonner';
import Link from 'next/link';

function JoinCircleContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join circle');
      }

      toast.success(`Welcome to ${data.circleName}!`);
      window.location.href = `/circle/${data.circleId}`;
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="bg-white rounded-xl border border-slate-100 p-8">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
          <UserPlus className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Join a circle</h2>
        <p className="text-slate-500 text-sm mb-6">Enter the invite code shared with you</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Invite Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., Ab3xK9mZ"
              className="mt-1.5 font-mono text-center text-lg tracking-wider"
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</>
            ) : (
              'Join Circle'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function JoinCirclePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs">Loading page...</span>
      </div>
    }>
      <JoinCircleContent />
    </Suspense>
  );
}
