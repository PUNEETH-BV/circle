'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, UserPlus, Loader2, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Link from 'next/link';

type JoinStep = 'enter_code' | 'send_request' | 'request_pending';

function JoinCircleContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [message, setMessage] = useState('');
  const [circleName, setCircleName] = useState('');
  const [step, setStep] = useState<JoinStep>('enter_code');
  const [loading, setLoading] = useState(false);

  const handleInitialSubmit = async (e: React.FormEvent) => {
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
        // Handle pre-existing pending requests or already joined status gracefully
        if (data.status === 'requested') {
          setCircleName(data.circleName || 'Private Circle');
          setStep('request_pending');
          return;
        }
        if (data.status === 'joined') {
          toast.success("You're already in this circle!");
          window.location.href = `/circle/${data.circleId}`;
          return;
        }
        throw new Error(data.error || 'Failed to join circle');
      }

      if (data.status === 'requested') {
        setCircleName(data.circleName);
        setStep('send_request');
      } else {
        toast.success(`Welcome to ${data.circleName}!`);
        window.location.href = `/circle/${data.circleId}`;
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: code.trim(),
          message: message.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      setStep('request_pending');
      toast.success('Join request sent successfully');
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'send_request') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Request to join "{circleName}"</h2>
          <p className="text-slate-500 text-xs mb-6">
            This circle is private. You must send a request, and an administrator will review and approve it.
          </p>

          <form onSubmit={handleSendRequest} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reqMsg">Introduce yourself to the admin (optional)</Label>
              <Textarea
                id="reqMsg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Hi, I am a classmate / student in your class..."
                className="h-24 resize-none"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep('enter_code')}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  'Send Request'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'request_pending') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Request Pending</h2>
            <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
              Your request to join <strong className="text-slate-700 font-semibold">{circleName || 'this circle'}</strong> has been sent. You will gain access as soon as an administrator approves it.
            </p>
          </div>
          <Link href="/" className="block">
            <Button className="w-full bg-slate-900 hover:bg-slate-800">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
          <UserPlus className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Join a circle</h2>
        <p className="text-slate-500 text-sm mb-6">Enter the invite code shared with you</p>

        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Invite Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., Ab3xK9mZ"
              className="mt-1.5 font-mono text-center text-lg tracking-wider bg-slate-50/50"
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
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
