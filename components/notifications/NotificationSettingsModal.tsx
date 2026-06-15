'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Settings, Users, Bell, BellRing, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import type { CircleMember } from '@/types';
import { toast } from 'sonner';

interface NotificationSettingsModalProps {
  open: boolean;
  onClose: () => void;
  circleId: string;
  circleName: string;
}

export function NotificationSettingsModal({
  open,
  onClose,
  circleId,
  circleName,
}: NotificationSettingsModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Subscription state
  const [fileUploadEnabled, setFileUploadEnabled] = useState(false);
  const [uploaderScope, setUploaderScope] = useState<'all' | 'specific'>('all');
  const [selectedUploaderIds, setSelectedUploaderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !circleId) return;
    loadSettingsAndMembers();
  }, [open, circleId]);

  const loadSettingsAndMembers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      setCurrentUserId(user.id);

      // Load members for specific uploader selection
      const { data: memberData, error: memberError } = await supabase
        .from('circle_members')
        .select('*, profile:profiles(*)')
        .eq('circle_id', circleId);

      if (memberError) throw memberError;

      // Filter out the current user (you don't get notifications for your own uploads)
      const otherMembers = (memberData as CircleMember[] || []).filter(
        m => m.user_id !== user.id
      );
      setMembers(otherMembers);

      // Load existing subscriptions
      const { data: subData, error: subError } = await supabase
        .from('notification_subscriptions')
        .select('*')
        .eq('circle_id', circleId)
        .eq('user_id', user.id);

      if (subError) throw subError;

      // Reset state first
      setFileUploadEnabled(false);
      setUploaderScope('all');
      setSelectedUploaderIds([]);

      // Process loaded subscription
      const fileSub = subData?.find(s => s.event_type === 'file_uploaded');
      if (fileSub) {
        setFileUploadEnabled(true);
        const filter = fileSub.filter || {};
        if (filter.uploader_ids && Array.isArray(filter.uploader_ids) && filter.uploader_ids.length > 0) {
          setUploaderScope('specific');
          setSelectedUploaderIds(filter.uploader_ids);
        } else {
          setUploaderScope('all');
        }
      }

    } catch (err: any) {
      toast.error('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUploader = (memberId: string) => {
    setSelectedUploaderIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);

    try {
      if (fileUploadEnabled) {
        // Prepare filter
        const filter = uploaderScope === 'specific' 
          ? { uploader_ids: selectedUploaderIds }
          : {};

        // Upsert subscription
        const { error } = await supabase
          .from('notification_subscriptions')
          .upsert({
            user_id: currentUserId,
            circle_id: circleId,
            event_type: 'file_uploaded',
            filter
          }, { onConflict: 'user_id,circle_id,event_type' });

        if (error) throw error;
      } else {
        // Delete subscription if disabled
        const { error } = await supabase
          .from('notification_subscriptions')
          .delete()
          .eq('user_id', currentUserId)
          .eq('circle_id', circleId)
          .eq('event_type', 'file_uploaded');

        if (error) throw error;
      }

      toast.success('Preferences saved successfully!');
      onClose();
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notification Settings</h3>
              <p className="text-[10px] text-slate-400">Configure notifications for "{circleName}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs">Loading preferences...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Default/Mandatory Notice */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3">
                <Bell className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">Default Notifications</span>
                  <p className="text-slate-500 leading-relaxed">
                    You will automatically receive notifications when you are approved/rejected, removed, or when someone requests to join (admins only). These cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Custom File Upload Subscription */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-indigo-600" />
                    <Label htmlFor="fileNotifToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                      File Upload Notifications
                    </Label>
                  </div>
                  <div className="relative inline-flex items-center">
                    <input
                      id="fileNotifToggle"
                      type="checkbox"
                      checked={fileUploadEnabled}
                      onChange={(e) => setFileUploadEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 cursor-pointer" />
                  </div>
                </div>

                {fileUploadEnabled && (
                  <div className="space-y-4 pl-6 animate-fadeIn">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Who should trigger notifications?
                      </span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="scope"
                            checked={uploaderScope === 'all'}
                            onChange={() => setUploaderScope('all')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>All Members</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="scope"
                            checked={uploaderScope === 'specific'}
                            onChange={() => setUploaderScope('specific')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Specific Members</span>
                        </label>
                      </div>
                    </div>

                    {uploaderScope === 'specific' && (
                      <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/50 max-h-48 overflow-y-auto">
                        {members.length === 0 ? (
                          <p className="text-[10px] text-slate-400 text-center py-4">No other members in this circle.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {members.map(member => {
                              const isChecked = selectedUploaderIds.includes(member.user_id);
                              return (
                                <label
                                  key={member.id}
                                  className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-all ${
                                    isChecked 
                                      ? 'border-indigo-100 bg-indigo-50/30' 
                                      : 'border-slate-100 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleUploader(member.user_id)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="truncate font-medium text-slate-700">
                                    {member.profile?.full_name || 'Member'}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5" />Save Preferences</>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
