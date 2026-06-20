'use client';

import { useState, useEffect } from 'react';
import { useAssignments, Assignment } from '@/lib/hooks/useAssignments';
import { 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  BookOpen, 
  RefreshCw,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/formatDate';
import { getCircleColor } from '@/lib/utils/getCircleColor';

export default function DeadlinesPage() {
  const { assignments, loading, refreshAssignments } = useAssignments();

  // Helper to categorize assignments
  const getCategorizedAssignments = () => {
    const now = new Date();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const overdue: Assignment[] = [];
    const dueToday: Assignment[] = [];
    const dueThisWeek: Assignment[] = [];
    const upcoming: Assignment[] = [];

    assignments.forEach((a) => {
      const isSubmitted = a.submission?.status === 'submitted';
      const dueDate = new Date(a.due_date);

      if (isSubmitted) {
        // We can place completed assignments in a separate section or filter them,
        // let's put them in upcoming or skip them if completed (or just display in their respective time blocks with "Submitted" badge).
        // For deadlines agenda, keeping them categorized by time is best.
      }

      if (dueDate < now) {
        if (!isSubmitted) {
          overdue.push(a);
        } else {
          upcoming.push(a); // Or treat as upcoming/archive
        }
      } else if (dueDate <= todayEnd) {
        dueToday.push(a);
      } else if (dueDate <= weekEnd) {
        dueThisWeek.push(a);
      } else {
        upcoming.push(a);
      }
    });

    // Sort function (ascending due date)
    const sortByDate = (arr: Assignment[]) => 
      arr.sort((x, y) => new Date(x.due_date).getTime() - new Date(y.due_date).getTime());

    return {
      overdue: sortByDate(overdue),
      dueToday: sortByDate(dueToday),
      dueThisWeek: sortByDate(dueThisWeek),
      upcoming: sortByDate(upcoming),
    };
  };

  const categorized = getCategorizedAssignments();
  const hasDeadlines = assignments.length > 0;

  const renderDeadlineCard = (assignment: Assignment) => {
    const isSubmitted = assignment.submission?.status === 'submitted';
    const isOverdue = new Date(assignment.due_date) < new Date() && !isSubmitted;
    const circleColor = getCircleColor(assignment.circle?.name || '');

    return (
      <div 
        key={assignment.id} 
        className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md border border-slate-100 hover:border-indigo-200 rounded-xl hover:shadow-sm transition-all duration-200"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-3 h-3 rounded-full shrink-0 ${circleColor}`} />
          <div className="space-y-1 min-w-0">
            <Link 
              href={`/circle/${assignment.circle_id}/assignments`}
              className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate block"
            >
              {assignment.title}
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-600 truncate max-w-[120px]">{assignment.circle?.name}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Due {formatDate(assignment.due_date)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Submitted</span>
            </Badge>
          ) : isOverdue ? (
            <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 animate-pulse">
              <AlertCircle className="w-3 h-3" />
              <span>Overdue</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Pending</span>
            </Badge>
          )}
          <Link 
            href={`/circle/${assignment.circle_id}/assignments`}
            className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-white/60 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Cross-Circle Deadlines</span>
          </h1>
          <p className="text-sm text-slate-500">A unified timeline of all assignments and tasks across your Circles.</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={refreshAssignments}
          className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : !hasDeadlines ? (
        <div className="bg-white/40 border border-slate-100 rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No deadlines found</h3>
          <p className="text-sm text-slate-500 mt-1">There are no assignments in any of your active Circles.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overdue Section */}
          {categorized.overdue.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Overdue ({categorized.overdue.length})</span>
              </h3>
              <div className="space-y-2">
                {categorized.overdue.map(renderDeadlineCard)}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {categorized.dueToday.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Due Today ({categorized.dueToday.length})</span>
              </h3>
              <div className="space-y-2">
                {categorized.dueToday.map(renderDeadlineCard)}
              </div>
            </div>
          )}

          {/* Due This Week Section */}
          {categorized.dueThisWeek.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Due This Week ({categorized.dueThisWeek.length})</span>
              </h3>
              <div className="space-y-2">
                {categorized.dueThisWeek.map(renderDeadlineCard)}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {categorized.upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Upcoming & Completed ({categorized.upcoming.length})</span>
              </h3>
              <div className="space-y-2">
                {categorized.upcoming.map(renderDeadlineCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
