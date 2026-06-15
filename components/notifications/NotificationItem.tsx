'use client';

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  UserMinus, 
  UserPlus, 
  FileUp, 
  FileText, 
  UserCheck, 
  Bell, 
  CircleDot 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AppNotification } from '@/types';
import Link from 'next/link';

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onClosePanel?: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClosePanel }: NotificationItemProps) {
  const getIconAndColor = () => {
    switch (notification.type) {
      case 'join_approved':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          bgColor: 'bg-emerald-50'
        };
      case 'join_rejected':
        return {
          icon: <XCircle className="w-5 h-5 text-rose-500" />,
          bgColor: 'bg-rose-50'
        };
      case 'removed_from_circle':
        return {
          icon: <UserMinus className="w-5 h-5 text-amber-500" />,
          bgColor: 'bg-amber-50'
        };
      case 'new_join_request':
        return {
          icon: <UserPlus className="w-5 h-5 text-indigo-500" />,
          bgColor: 'bg-indigo-50'
        };
      case 'file_uploaded':
        return {
          icon: <FileUp className="w-5 h-5 text-purple-500" />,
          bgColor: 'bg-purple-50'
        };
      case 'new_note':
        return {
          icon: <FileText className="w-5 h-5 text-blue-500" />,
          bgColor: 'bg-blue-50'
        };
      case 'new_member':
        return {
          icon: <UserCheck className="w-5 h-5 text-teal-500" />,
          bgColor: 'bg-teal-50'
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-slate-400" />,
          bgColor: 'bg-slate-50'
        };
    }
  };

  const { icon, bgColor } = getIconAndColor();

  const getLink = () => {
    const meta = notification.metadata || {};
    if (notification.type === 'join_approved' && meta.circle_id) {
      return `/circle/${meta.circle_id}`;
    }
    if (notification.type === 'new_join_request' && notification.circle_id) {
      return `/circle/${notification.circle_id}/requests`;
    }
    if (notification.type === 'file_uploaded' && notification.circle_id) {
      if (meta.folder_id) {
        return `/circle/${notification.circle_id}/files/${meta.folder_id}`;
      }
      return `/circle/${notification.circle_id}/files`;
    }
    if (notification.circle_id) {
      return `/circle/${notification.circle_id}`;
    }
    return null;
  };

  const link = getLink();

  const content = (
    <div 
      className={`p-4 flex gap-3 transition-all duration-200 cursor-pointer ${
        notification.is_read ? 'hover:bg-slate-50/50' : 'bg-indigo-50/20 hover:bg-indigo-50/30'
      }`}
      onClick={() => {
        if (!notification.is_read) {
          onMarkAsRead(notification.id);
        }
        if (onClosePanel && link) {
          onClosePanel();
        }
      }}
    >
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center shrink-0`}>
        {icon}
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className={`text-sm ${notification.is_read ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <CircleDot className="w-2.5 h-2.5 text-indigo-600 shrink-0 mt-1 fill-indigo-600 animate-pulse" />
          )}
        </div>
        
        {notification.body && (
          <p className="text-xs text-slate-500 leading-relaxed break-words">
            {notification.body}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          {notification.metadata?.circle_name && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              {notification.metadata.circle_name}
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-medium">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );

  return link ? (
    <Link href={link} className="block border-b border-slate-100 last:border-0">
      {content}
    </Link>
  ) : (
    <div className="border-b border-slate-100 last:border-0">
      {content}
    </div>
  );
}
