'use client';

import { useRouter } from 'next/navigation';
import { Users, FileText, Clock, ArrowUpRight } from 'lucide-react';
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
      className="bg-white rounded-2xl border border-slate-100 p-5 text-left hover:border-indigo-200/80 hover:shadow-xl hover:shadow-indigo-500/[0.04] hover:-translate-y-1 transition-all duration-300 group w-full flex flex-col justify-between h-48 relative overflow-hidden"
    >
      {/* Decorative corner shape */}
      <div 
        className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.03] transition-all group-hover:scale-110 duration-500 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <div className="w-full">
        <div className="flex items-start gap-4 justify-between">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-md shadow-black/5 group-hover:scale-105 transition-transform duration-300"
            style={{ backgroundColor: color }}
          >
            {getInitials(circle.name)}
          </div>
          
          {/* ArrowUpRight hover icon */}
          <div className="w-6 h-6 rounded-full bg-slate-55 border border-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors group-hover:scale-110 duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate text-sm md:text-base leading-snug">
            {circle.name}
          </h3>
          {circle.description ? (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {circle.description}
            </p>
          ) : (
            <p className="text-xs text-slate-350 italic mt-1">No description provided.</p>
          )}
        </div>
      </div>

      {/* Stats container */}
      <div className="flex items-center gap-3 mt-4 text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-3 w-full">
        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
          <Users className="w-3 h-3 text-indigo-500" />
          {circle.member_count || 0} members
        </span>
        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
          <FileText className="w-3 h-3 text-emerald-500" />
          {circle.file_count || 0} files
        </span>
        <span className="flex items-center gap-1 ml-auto text-[9px] font-medium">
          <Clock className="w-3 h-3" />
          {formatDate(circle.created_at)}
        </span>
      </div>
    </button>
  );
}
