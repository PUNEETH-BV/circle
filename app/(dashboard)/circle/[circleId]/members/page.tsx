'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, UserMinus, ShieldAlert, ShieldCheck, Link2, Copy, LogOut, Loader2, Lock, Unlock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useMembers } from '@/lib/hooks/useMembers';
import { useCircle } from '@/lib/hooks/useCircle';
import { createClient } from '@/lib/supabase/client';
import type { CircleMember } from '@/types';
import { formatDate } from '@/lib/utils/formatDate';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export default function MembersPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = createClient();

  const {
    members,
    loading: loadingMembers,
    updateMemberRole,
    removeMember,
    updateUploadPermission,
    updateAllUploadPermissions,
    leaveCircle,
    blockMember,
    unblockMember,
  } = useMembers(circleId);

  const { circle, userRole } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [memberToSuspend, setMemberToSuspend] = useState<CircleMember | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });

    if (typeof window !== 'undefined' && circle?.invite_code) {
      setInviteLink(`${window.location.origin}/join-circle?code=${circle.invite_code}`);
    }
  }, [circle]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  const handleCopyCode = () => {
    if (circle?.invite_code) {
      navigator.clipboard.writeText(circle.invite_code);
      toast.success('Invite code copied!');
    }
  };

  const filteredMembers = members.filter((member) =>
    member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveMember = async () => {
    if (memberToRemove) {
      await removeMember(memberToRemove);
      setMemberToRemove(null);
    }
  };

  // Find the selected member name for delete warning text
  const memberName = members.find((m) => m.id === memberToRemove)?.profile?.full_name || 'this member';

  // Count admins to check if leaving is safe
  const adminCount = members.filter((m) => m.role === 'admin').length;

  const handleLeaveClick = () => {
    if (isAdmin && adminCount === 1) {
      toast.error('You are the only admin. Assign another member as admin before leaving.');
      return;
    }
    setShowLeaveConfirm(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Members List Column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Workspace Members</h3>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              {isAdmin && (
                <div className="flex items-center gap-1 border border-slate-100 bg-slate-50/50 p-1 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-indigo-600 transition-colors"
                    onClick={() => updateAllUploadPermissions(true)}
                  >
                    Allow All Uploads
                  </Button>
                  <span className="w-px h-3.5 bg-slate-200" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-red-600 transition-colors"
                    onClick={() => updateAllUploadPermissions(false)}
                  >
                    Restrict All Uploads
                  </Button>
                </div>
              )}
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
                {members.length} total
              </span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border border-slate-200"
            />
          </div>

          {loadingMembers ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-full bg-slate-100 skeleton" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/4 rounded bg-slate-100 skeleton" />
                    <div className="h-3 w-1/6 rounded bg-slate-100 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No members found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredMembers.map((member) => {
                const isSelf = member.user_id === currentUserId;
                const isBlocked = !!member.is_blocked && (
                  !member.blocked_until || 
                  new Date(member.blocked_until as string) > new Date()
                );
                return (
                  <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={member.profile?.full_name || 'User'}
                        avatarUrl={member.profile?.avatar_url}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {member.profile?.full_name}
                          </span>
                          {isSelf && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              You
                            </Badge>
                          )}
                          {isBlocked && (
                            <Badge className="bg-red-50 text-red-650 hover:bg-red-50 border border-red-100 px-1.5 py-0 text-[10px] gap-1 select-none font-semibold">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Suspended</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Joined {formatDate(member.joined_at)}
                        </p>
                        {isBlocked && (
                          <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1 font-semibold">
                            <span>•</span>
                            <span className="truncate">
                              Suspended {member.blocked_until ? `until ${new Date(member.blocked_until as string).toLocaleString()}` : 'permanently'}
                              {member.block_reason ? ` - "${member.block_reason}"` : ''}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Upload permission toggle (admin only, for standard members) */}
                      {isAdmin && member.role === 'member' && (
                        <div className="flex items-center gap-1.5 mr-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                            Upload
                          </label>
                          <input
                            type="checkbox"
                            checked={member.can_upload !== false}
                            onChange={(e) => updateUploadPermission(member.id, e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            title="Toggle upload rights"
                          />
                        </div>
                      )}

                      {/* Role Badge / Changer */}
                      {isAdmin && !isSelf ? (
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'member')}
                          className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <Badge
                          variant={member.role === 'admin' ? 'default' : 'outline'}
                          className="capitalize py-0.5"
                        >
                          {member.role === 'admin' ? (
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          ) : null}
                          {member.role}
                        </Badge>
                      )}

                      {/* Block / Unblock Button (admin only, not for self) */}
                      {isAdmin && !isSelf && (
                        isBlocked ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => unblockMember(member.id)}
                            title="Restore access / Unsuspend"
                          >
                            <Unlock className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => setMemberToSuspend(member)}
                            title="Suspend Member"
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                        )
                      )}

                      {/* Remove Button */}
                      {isAdmin && !isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setMemberToRemove(member.id)}
                          title="Remove Member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leave Workspace Button (Only if not last admin) */}
        <div className="flex justify-start">
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
            onClick={handleLeaveClick}
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Circle</span>
          </Button>
        </div>
      </div>

      {/* Invite Box Column */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Invite Members</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add collaborators to this circle using the invite link or code.
            </p>
          </div>

          {circle?.invite_code ? (
            <>
              {/* Copy Invite Link */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Invite Link
                </span>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="h-9 font-sans text-xs bg-slate-50 text-slate-600 border-slate-200 select-all"
                  />
                  <Button size="sm" variant="outline" className="h-9 px-3" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Copy Invite Code */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Invite Code
                </span>
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <code className="text-base font-bold font-mono text-slate-800 tracking-widest">
                    {circle.invite_code}
                  </code>
                  <Button size="sm" variant="ghost" className="h-8 hover:bg-slate-200/50 gap-1 text-xs text-indigo-600 font-semibold" onClick={handleCopyCode}>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center pt-2 space-y-3">
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <QRCodeSVG value={inviteLink} size={140} />
                </div>
                <span className="text-xs font-semibold text-slate-500">Scan QR code to join</span>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          )}
        </div>
      </div>

      {/* Remove Confirm Modal */}
      <ConfirmDialog
        open={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        description={`Are you sure you want to remove "${memberName}" from this circle? They will lose access to all files and notes.`}
        confirmLabel="Remove"
        variant="danger"
      />

      {/* Leave Confirm Modal */}
      <ConfirmDialog
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={leaveCircle}
        title="Leave Circle"
        description="Are you sure you want to leave this circle? You will lose access to all resources unless you are invited back."
        confirmLabel="Leave"
        variant="danger"
      />

      {/* Suspend Member Modal */}
      <SuspendModal
        open={memberToSuspend !== null}
        onClose={() => setMemberToSuspend(null)}
        onConfirm={async (duration, reason) => {
          if (memberToSuspend) {
            await blockMember(memberToSuspend.id, duration, reason);
          }
        }}
        memberName={memberToSuspend?.profile?.full_name || 'this member'}
      />

    </div>
  );
}

interface SuspendModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (duration: 'permanent' | '1h' | '1d' | '1w', reason: string) => Promise<void>;
  memberName: string;
}

function SuspendModal({ open, onClose, onConfirm, memberName }: SuspendModalProps) {
  const [duration, setDuration] = useState<'permanent' | '1h' | '1d' | '1w'>('permanent');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(duration, reason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
      setReason('');
      setDuration('permanent');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-slate-100 shadow-xl p-6 max-w-md w-full mx-4 z-10 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Suspend Member</h3>
            <p className="text-slate-500 text-xs mt-1">
              Temporarily or permanently restrict <strong className="text-slate-700">{memberName}</strong>'s access to this circle.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Suspension Duration
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'permanent', label: 'Permanent' },
                  { value: '1h', label: '1 Hour' },
                  { value: '1d', label: '1 Day' },
                  { value: '1w', label: '1 Week' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    duration === opt.value
                      ? 'border-indigo-650 bg-indigo-50/50 text-indigo-650 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="suspend-reason" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Reason (Optional)
            </label>
            <textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Inappropriate behavior in chat, temporary project hold..."
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 placeholder-slate-400 min-h-[70px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-650 hover:bg-amber-700 text-white h-9 text-xs font-semibold shadow-sm"
            >
              {submitting ? 'Suspending...' : 'Suspend Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
