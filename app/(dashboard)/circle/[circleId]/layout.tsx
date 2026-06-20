import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CircleTabNav } from '@/components/circle/CircleTabNav';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default async function CircleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { circleId: string };
}) {
  const { circleId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Check membership and block status
  const { data: member } = await supabase
    .from('circle_members')
    .select('role, is_blocked, blocked_until, block_reason')
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .single();

  if (!member) redirect('/');

  // Evaluate if the block is active (either permanent or temporary in the future)
  const isBlocked = member.is_blocked && (
    member.blocked_until === null || 
    new Date(member.blocked_until) > new Date()
  );

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-8 bg-white border border-slate-200/80 rounded-2xl max-w-lg mx-auto shadow-xl space-y-6 my-12 animate-fadeIn select-none">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-md shadow-red-500/5 animate-pulse shrink-0">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
            An administrator of this circle has suspended your account. You no longer have access to this workspace.
          </p>
        </div>
        
        {/* Block details card */}
        <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4.5 text-left text-xs font-semibold text-slate-700 space-y-2 max-w-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Duration:</span>
            <span className={member.blocked_until ? "text-amber-600" : "text-red-650"}>
              {member.blocked_until ? `Temporary (Until ${new Date(member.blocked_until).toLocaleString()})` : "Permanent Suspension"}
            </span>
          </div>
          {member.block_reason && (
            <div className="border-t border-slate-200/50 pt-2 space-y-1">
              <span className="text-slate-400 block">Reason:</span>
              <p className="text-[11px] text-slate-650 font-normal italic leading-normal">"{member.block_reason}"</p>
            </div>
          )}
        </div>

        <Link 
          href="/" 
          className="text-xs font-bold text-indigo-650 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl transition-all shadow-sm block select-none"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { data: circle } = await supabase
    .from('circles')
    .select('*')
    .eq('id', circleId)
    .single();

  if (!circle) redirect('/');

  return (
    <div>
      <CircleTabNav circleId={circleId} circleName={circle.name} isAdmin={member.role === 'admin'} />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
