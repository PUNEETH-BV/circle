'use client';

import { useRouter } from 'next/navigation';
import { Users, FileText, Clock } from 'lucide-react';
import { getCircleColor } from '@/lib/utils/getCircleColor';
import { getInitials } from '@/lib/utils/getInitials';
import { formatDate } from '@/lib/utils/formatDate';
import type { Circle } from '@/types';

interface CircleCardProps {
  circle: Circle;
}

export function CircleCard({ circle }: CircleCardProps) {
  const router = useRouter();
  const color = getCircleColor(circle.id);

  return (
    <button
      onClick={() => router.push(`/circle/${circle.id}`)}
      className="bg-white rounded-xl border border-slate-100 p-5 text-left hover:border-indigo-200 hover:shadow-sm transition-all group w-full"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {getInitials(circle.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
            {circle.name}
          </h3>
          {circle.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{circle.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {circle.member_count || 0} members
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {circle.file_count || 0} files
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(circle.created_at)}
        </span>
      </div>
    </button>
  );
}
