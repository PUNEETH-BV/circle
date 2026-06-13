import { SignupForm } from '@/components/auth/SignupForm';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-full" />
          </div>
          <span className="text-xl font-semibold text-slate-900">Circle</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Create your account</h2>
        <p className="text-slate-500 mt-1">Get started with Circle for free</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-indigo-600 font-medium hover:text-indigo-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
