import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-full" />
          </div>
          <span className="text-xl font-semibold text-slate-900">Circle</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
        <p className="text-slate-500 mt-1">Sign in to your account to continue</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-slate-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-indigo-600 font-medium hover:text-indigo-700">
          Sign up
        </Link>
      </p>
    </div>
  );
}
