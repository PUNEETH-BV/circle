'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface TaskItem {
  id: string;
  circle_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  assignee_id?: string;
  position: number;
  created_at: string;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function useTasks(circleId: string) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel(`circle-tasks-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_tasks',
        filter: `circle_id=eq.${circleId}`
      }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('circle_tasks')
        .select('*, assignee:profiles(*)')
        .eq('circle_id', circleId)
        .order('position', { ascending: true });

      if (error) throw error;
      setTasks((data as TaskItem[]) || []);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createTask(title: string, description: string, assigneeId?: string) {
    try {
      // Calculate position as the highest position + 1
      const maxPosition = tasks.length > 0 
        ? Math.max(...tasks.map(t => t.position)) 
        : 0;

      const { error } = await supabase
        .from('circle_tasks')
        .insert({
          circle_id: circleId,
          title: title.trim(),
          description: description.trim() || null,
          assignee_id: assigneeId || null,
          status: 'todo',
          position: maxPosition + 1
        });

      if (error) throw error;
      toast.success('Task created successfully!');
    } catch (err: any) {
      toast.error('Failed to create task: ' + err.message);
      throw err;
    }
  }

  async function updateTaskStatus(taskId: string, status: 'todo' | 'in_progress' | 'done') {
    // Optimistic Update
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, status } : t)
    );

    try {
      const { error } = await supabase
        .from('circle_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update task: ' + err.message);
      fetchTasks(); // Restore state
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('circle_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task deleted');
    } catch (err: any) {
      toast.error('Failed to delete task: ' + err.message);
    }
  }

  return { tasks, loading, createTask, updateTaskStatus, deleteTask, refreshTasks: fetchTasks };
}
