'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleResend() {
    if (!email) {
      toast.error('Please enter your email address to resend the verification link.');
      return;
    }

    setIsResending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
        <Mail className="w-8 h-8 text-indigo-600" />
      </div>

      <h2 className="text-2xl font-semibold text-slate-900 mb-2">Check your email</h2>
      <p className="text-slate-500 mb-8 max-w-sm">
        We sent you a verification link. Click the link in your email to verify your account.
      </p>

      <div className="w-full space-y-4 mb-6">
        <div className="space-y-2 text-left">
          <Label htmlFor="resend-email">Email address</Label>
          <Input
            id="resend-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isResending}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={isResending}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resending…
            </>
          ) : (
            'Resend verification email'
          )}
        </Button>
      </div>

      <Link
        href="/auth/login"
        className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
      >
        ← Back to login
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs">Loading verify page...</span>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
