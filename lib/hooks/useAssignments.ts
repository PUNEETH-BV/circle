'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface Assignment {
  id: string;
  circle_id: string;
  created_by: string;
  title: string;
  description?: string;
  due_date: string;
  created_at: string;
  creator?: {
    full_name: string;
  };
  circle?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  submission?: AssignmentSubmission;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  status: 'pending' | 'submitted';
  file_path?: string;
  submitted_at?: string;
}

export function useAssignments(circleId?: string) {
  const supabase = createClient();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchAssignments(user.id);
      } else {
        setLoading(false);
      }
    }
    initUser();

    if (!circleId) return;

    const channel = supabase
      .channel(`circle-assignments-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignments',
        filter: `circle_id=eq.${circleId}`
      }, () => {
        if (currentUserId) fetchAssignments(currentUserId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, currentUserId]);

  async function fetchAssignments(uid: string) {
    try {
      // Query assignments
      let query = supabase.from('assignments').select('*, creator:profiles(*), circle:circles(*)');
      
      if (circleId) {
        query = query.eq('circle_id', circleId);
      }
      
      const { data: assignmentsData, error: assignmentsErr } = await query.order('due_date', { ascending: true });
      if (assignmentsErr) throw assignmentsErr;

      // Query current user's submissions
      const { data: submissionsData, error: submissionsErr } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('user_id', uid);

      if (submissionsErr) throw submissionsErr;

      const submissionsMap = new Map(
        (submissionsData || []).map(s => [s.assignment_id, s])
      );

      const enriched = (assignmentsData || []).map((a: any) => ({
        ...a,
        submission: submissionsMap.get(a.id) || undefined
      }));

      setAssignments(enriched);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createAssignment(title: string, description: string, dueDate: string) {
    if (!circleId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assignments')
        .insert({
          circle_id: circleId,
          created_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate
        });

      if (error) throw error;
      toast.success('Assignment created!');
    } catch (err: any) {
      toast.error('Failed to create assignment: ' + err.message);
      throw err;
    }
  }

  async function submitAssignment(assignmentId: string, filePath?: string) {
    if (!currentUserId) return;

    // Optimistic Update
    setAssignments(prev => 
      prev.map(a => {
        if (a.id === assignmentId) {
          return {
            ...a,
            submission: {
              id: a.submission?.id || 'temp',
              assignment_id: assignmentId,
              user_id: currentUserId,
              status: 'submitted',
              file_path: filePath,
              submitted_at: new Date().toISOString()
            }
          };
        }
        return a;
      })
    );

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .upsert({
          assignment_id: assignmentId,
          user_id: currentUserId,
          status: 'submitted',
          file_path: filePath || null,
          submitted_at: new Date().toISOString()
        }, { onConflict: 'assignment_id,user_id' });

      if (error) throw error;
      toast.success('Assignment submitted!');
    } catch (err: any) {
      toast.error('Failed to submit assignment: ' + err.message);
      if (currentUserId) fetchAssignments(currentUserId);
    }
  }

  async function unsubmitAssignment(assignmentId: string) {
    if (!currentUserId) return;

    // Optimistic Update
    setAssignments(prev => 
      prev.map(a => {
        if (a.id === assignmentId) {
          return {
            ...a,
            submission: undefined
          };
        }
        return a;
      })
    );

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('user_id', currentUserId);

      if (error) throw error;
      toast.success('Submission recalled');
    } catch (err: any) {
      toast.error('Failed to recall submission: ' + err.message);
      if (currentUserId) fetchAssignments(currentUserId);
    }
  }

  return { 
    assignments, 
    loading, 
    createAssignment, 
    submitAssignment, 
    unsubmitAssignment,
    refreshAssignments: () => currentUserId && fetchAssignments(currentUserId)
  };
}
