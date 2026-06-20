'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCircle } from '@/lib/hooks/useCircle';
import { useTasks, TaskItem } from '@/lib/hooks/useTasks';

import { UserAvatar } from '@/components/shared/UserAvatar';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  ListTodo, 
  Clock, 
  Calendar,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { CircleMember } from '@/types';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = createClient();

  const { circle, loading: loadingCircle, userRole } = useCircle(circleId);
  const { tasks, loading: loadingTasks, createTask, updateTaskStatus, deleteTask } = useTasks(circleId);

  // States
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      try {
        const { data, error } = await supabase
          .from('circle_members')
          .select('*, profile:profiles(*)')
          .eq('circle_id', circleId)
          .eq('approved', true);
        if (!error && data) {
          setMembers(data as CircleMember[]);
        }
      } catch (err) {
        console.error('Failed to load circle members for tasks:', err);
      }
    }
    loadMembers();
  }, [circleId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    setSubmitting(true);
    try {
      await createTask(taskTitle, taskDesc, assigneeId || undefined);
      setTaskTitle('');
      setTaskDesc('');
      setAssigneeId('');
      setShowTaskForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCircle || !circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading workspace tasks...</span>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  // Group tasks by status
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const renderColumn = (
    title: string, 
    items: TaskItem[], 
    columnStatus: 'todo' | 'in_progress' | 'done',
    colorClass: string,
    bgClass: string,
    borderClass: string,
    Icon: any
  ) => {
    return (
      <div className="flex flex-col h-full bg-slate-50/50 border border-slate-100 rounded-2xl p-4 min-h-[500px]">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 select-none">
          <div className="flex items-center gap-2">
            <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-xs shadow-sm", bgClass, colorClass)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</span>
          </div>
          <span className="bg-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>

        {/* Task Cards list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loadingTasks ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[10px] border border-dashed border-slate-200 rounded-xl bg-white/40">
              No tasks in this column.
            </div>
          ) : (
            items.map(task => (
              <div 
                key={task.id} 
                className={cn(
                  "bg-white rounded-xl border p-4 shadow-[0_2px_6px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-slate-250 transition-all group relative border-l-4",
                  borderClass
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 break-words leading-tight">{task.title}</h4>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer shrink-0"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {task.description && (
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal break-words">{task.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  {/* Assignee */}
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignee.full_name}`}>
                      <UserAvatar 
                        name={task.assignee.full_name} 
                        avatarUrl={task.assignee.avatar_url} 
                        size="sm" 
                      />
                      <span className="text-[9px] font-bold text-slate-500 truncate max-w-[80px]">
                        {task.assignee.full_name.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-350 italic">Unassigned</span>
                  )}

                  {/* Shifting Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {columnStatus !== 'todo' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, columnStatus === 'done' ? 'in_progress' : 'todo')}
                        className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    )}
                    {columnStatus !== 'done' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, columnStatus === 'todo' ? 'in_progress' : 'done')}
                        className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Move right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 flex flex-col min-h-screen">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-end justify-end gap-4">
        <Button 
          onClick={() => setShowTaskForm(!showTaskForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold gap-1 rounded-xl self-start h-9 shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Task Creation Form Dropdown */}
      {showTaskForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm animate-fadeIn max-w-lg shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-45px uppercase tracking-wider block">Add Workspace Task</span>
            <button 
              type="button" 
              onClick={() => setShowTaskForm(false)} 
              className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <Input 
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task name/title..."
              disabled={submitting}
              className="text-xs h-9 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
            <Textarea
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Task description/details (optional)..."
              disabled={submitting}
              rows={2}
              className="text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
            
            {/* Assignee select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assign To</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={submitting}
                className="w-full text-xs h-9 rounded-lg border border-slate-200 px-3 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {members.map(member => (
                  <option key={member.id} value={member.user_id}>
                    {member.profile?.full_name || 'Member'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTaskForm(false);
                setTaskTitle('');
                setTaskDesc('');
                setAssigneeId('');
              }}
              disabled={submitting}
              className="h-8 text-xs rounded-lg border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs rounded-lg font-bold shadow-md shadow-indigo-600/10"
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating...</>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Kanban Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
        {renderColumn(
          'To Do', 
          todoTasks, 
          'todo', 
          'text-slate-600', 
          'bg-slate-100', 
          'border-l-slate-400',
          ListTodo
        )}
        {renderColumn(
          'In Progress', 
          inProgressTasks, 
          'in_progress', 
          'text-indigo-600', 
          'bg-indigo-100/60', 
          'border-l-indigo-500',
          Clock
        )}
        {renderColumn(
          'Done', 
          doneTasks, 
          'done', 
          'text-emerald-600', 
          'bg-emerald-100/60', 
          'border-l-emerald-500',
          CheckCircle
        )}
      </div>

    </div>
  );
}
