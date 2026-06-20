-- SQL Migration: Add suspension capability for workspace members
ALTER TABLE public.circle_members ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.circle_members ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.circle_members ADD COLUMN IF NOT EXISTS block_reason TEXT DEFAULT NULL;
