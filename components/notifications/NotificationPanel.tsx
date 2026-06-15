'use client';

import React, { useState } from 'react';
import { X, CheckCheck, BellOff, Loader2, Settings } from 'lucide-react';
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
}: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  if (!open) return null;

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
