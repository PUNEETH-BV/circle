-- Upgrades to public.circle_chat_messages to support attachments (photos, videos, memes/GIFs)
ALTER TABLE public.circle_chat_messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
