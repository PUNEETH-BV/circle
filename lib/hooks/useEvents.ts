'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface CircleEvent {
  id: string;
  circle_id: string;
  created_by: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_at: string;
  creator?: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useEvents(circleId: string) {
  const supabase = createClient();
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel(`circle-events-${circleId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_events',
        filter: `circle_id=eq.${circleId}`
      }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('circle_events')
        .select('*, creator:profiles(*)')
        .eq('circle_id', circleId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents((data as CircleEvent[]) || []);
    } catch (err: any) {
      console.error('Error fetching circle events:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createEvent(title: string, description: string, startTime: string, endTime: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('circle_events')
        .insert({
          circle_id: circleId,
          created_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          start_time: startTime,
          end_time: endTime
        });

      if (error) throw error;
      toast.success('Event scheduled successfully!');
    } catch (err: any) {
      toast.error('Failed to schedule event: ' + err.message);
      throw err;
    }
  }

  async function deleteEvent(eventId: string) {
    try {
      const { error } = await supabase
        .from('circle_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Event canceled');
    } catch (err: any) {
      toast.error('Failed to delete event: ' + err.message);
    }
  }

  return { events, loading, createEvent, deleteEvent, refreshEvents: fetchEvents };
}
