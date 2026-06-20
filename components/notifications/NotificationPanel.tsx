'use client';

import React, { useState } from 'react';
import { X, CheckCheck, BellOff, Loader2, Settings, BellRing } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import type { AppNotification } from '@/types';
import { isToday, isYesterday } from 'date-fns';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenSettings?: () => void;
  nativePermission?: NotificationPermission;
  isPushSupported?: boolean;
  onRequestNativePermission?: () => void;
}

export function NotificationPanel({
  open,
  onClose,
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenSettings,
  nativePermission = 'default',
  isPushSupported = false,
  onRequestNativePermission,
}: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  if (!open) return null;

  const showPermissionBanner = isPushSupported && nativePermission === 'default' && onRequestNativePermission;

  const filteredNotifications = notifications.filter(n => 
    activeTab === 'all' ? true : !n.is_read
  );

  // Grouping notifications by date
  const groupNotifications = (list: AppNotification[]) => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    list.forEach(n => {
      const date = new Date(n.created_at);
      if (isToday(date)) {
        today.push(n);
      } else if (isYesterday(date)) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = groupNotifications(filteredNotifications);

  const renderSection = (title: string, items: AppNotification[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2 py-2">
        <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </h3>
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden divide-y divide-slate-100">
          {items.map(item => (
            <NotificationItem 
              key={item.id} 
              notification={item} 
              onMarkAsRead={onMarkAsRead}
              onClosePanel={onClose}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-50 shadow-2xl flex flex-col border-l border-slate-200 transition-all duration-300">
        
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={onMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 p-1.5 hover:bg-indigo-50 rounded transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mark all as read</span>
              </button>
            )}
            {onOpenSettings && (
              <button 
                onClick={onOpenSettings}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notification Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-100 px-4 flex gap-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'all' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all relative ${
              activeTab === 'unread' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="absolute top-2.5 -right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Native Notification Permission Banner */}
        {showPermissionBanner && (
          <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-xl text-white shadow-md flex flex-col gap-3 relative overflow-hidden shrink-0 animate-fadeIn border border-indigo-400/20">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex gap-3 items-start relative z-10">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 shadow-inner">
                <BellRing className="w-4.5 h-4.5 text-white animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold tracking-wide">Enable Browser Notifications</h4>
                <p className="text-[10px] text-indigo-100 leading-normal font-medium">
                  Get real-time updates for announcements, uploads, and member requests directly on your device home screen even in background.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-1 relative z-10">
              <button
                onClick={onRequestNativePermission}
                className="px-3.5 py-1.5 bg-white text-indigo-600 hover:bg-slate-50 active:scale-95 text-[10px] font-bold rounded-lg transition-all shadow-md cursor-pointer hover:shadow-lg"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-sm">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <BellOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">All caught up!</p>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  {activeTab === 'unread' 
                    ? "You don't have any unread notifications right now."
                    : "No notifications found. You're all set!"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {renderSection('Today', today)}
              {renderSection('Yesterday', yesterday)}
              {renderSection('Earlier', earlier)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
