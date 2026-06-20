'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  circle_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function useChat(circleId: string) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime messages inserts
    const channel = supabase
      .channel(`circle-chat-${circleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_chat_messages',
        filter: `circle_id=eq.${circleId}`
      }, () => {
        // Re-fetch to get sender details joined properly
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('circle_chat_messages')
        .select('*, sender:profiles(*)')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: true })
        .limit(60);

      if (error) throw error;
      setMessages((data as ChatMessage[]) || []);
    } catch (err: any) {
      console.error('Error fetching chat messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(body: string) {
    if (!body.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('circle_chat_messages')
        .insert({
          circle_id: circleId,
          sender_id: user.id,
          body: body.trim()
        });

      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
      throw err;
    }
  }

  return { messages, loading, sendMessage, refreshMessages: fetchMessages };
}
