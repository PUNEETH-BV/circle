'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, X, ShieldAlert, Loader2, Clock, Inbox, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useJoinRequests } from '@/lib/hooks/useJoinRequests';
import { useCircle } from '@/lib/hooks/useCircle';
import { formatDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils';
import type { JoinRequest } from '@/types';

type RequestFilter = 'pending' | 'approved' | 'rejected';

export default function RequestsPage() {
  const params = useParams();
  const circleId = params.circleId as string;

  const {
    requests,
    loading: loadingRequests,
    approveRequest,
    rejectRequest
  } = useJoinRequests(circleId);

  const { userRole, loading: loadingCircle } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState<RequestFilter>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (loadingCircle || loadingRequests) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-slate-500 bg-white border border-slate-100 rounded-xl p-8 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading join requests...</span>
      </div>
    );
  }

  // Admin access guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-8 bg-white border border-slate-100 rounded-xl max-w-md mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h4 className="text-lg font-semibold text-slate-900 mb-1">Access Denied</h4>
        <p className="text-sm text-slate-500">
          Only circle administrators have permission to access the join requests.
        </p>
      </div>
    );
  }

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  const handleApprove = async (requestId: string, userId: string) => {
    setProcessingId(requestId);
    try {
      await approveRequest(requestId, userId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectRequest(requestId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Join Requests</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review and manage pending membership requests for this private circle.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {(['pending', 'approved', 'rejected'] as RequestFilter[]).map((tab) => {
          const count = requests.filter((r) => r.status === tab).length;
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all',
                isSelected
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              <span className="flex items-center gap-2">
                <span>{tab}</span>
                <Badge
                  className={cn(
                    'px-1.5 py-0 text-[10px] pointer-events-none rounded-full',
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {count}
                </Badge>
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            {activeTab === 'pending' && <Inbox className="w-6 h-6" />}
            {activeTab === 'approved' && <UserCheck className="w-6 h-6" />}
            {activeTab === 'rejected' && <UserX className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">
              No {activeTab} requests
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {activeTab === 'pending'
                ? 'All pending join requests have been processed.'
                : `No requests have been ${activeTab} yet.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isProcessing = processingId === req.id;
            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <UserAvatar
                    name={req.profile?.full_name || 'User'}
                    avatarUrl={req.profile?.avatar_url}
                    size="md"
                    className="flex-shrink-0"
                  />
                  <div className="space-y-2 min-w-0">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {req.profile?.full_name || 'Unknown User'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Requested {formatDate(req.requested_at)}</span>
                      </p>
                    </div>

                    {req.message && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 max-w-xl">
                        <p className="text-xs text-slate-600 italic leading-relaxed break-words">
                          "{req.message}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 text-xs px-3 font-semibold"
                      onClick={() => handleReject(req.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>Reject</span>
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs px-3 font-semibold"
                      onClick={() => handleApprove(req.id, req.user_id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>Approve</span>
                    </Button>
                  </div>
                )}

                {req.status !== 'pending' && (
                  <div className="self-end md:self-center">
                    <Badge
                      className={cn(
                        'px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase pointer-events-none border',
                        req.status === 'approved'
                          ? 'bg-green-50 text-green-600 border-green-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      )}
                    >
                      {req.status}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
