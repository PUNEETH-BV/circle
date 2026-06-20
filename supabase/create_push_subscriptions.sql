-- CREATE PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Add unique constraint per subscription endpoint to avoid duplicates
    endpoint TEXT GENERATED ALWAYS AS (subscription->>'endpoint') STORED UNIQUE
);

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" 
    ON public.push_subscriptions 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Enable Realtime replication (optional, for debugging)
alter publication supabase_realtime add table public.push_subscriptions;

-- =========================================================================
-- NOTE ON HOW TO TRIGGER WEB PUSH NOTIFICATIONS AUTOMATICALLY:
-- 
-- Option A: Supabase Database Webhook (RECOMMENDED)
-- 1. Go to your Supabase Dashboard -> Database -> Webhooks.
-- 2. Click "Enable Webhooks" (if not already enabled).
-- 3. Click "Create Webhook".
-- 4. Name: "send_push_notification".
-- 5. Table: "public.notifications".
-- 6. Events: Check "Insert" only.
-- 7. Type: "HTTP Post".
-- 8. URL: "https://your-domain.vercel.app/api/push-send" 
--    (For local testing with Ngrok: "https://<your-ngrok-subdomain>.ngrok-free.app/api/push-send")
-- 9. HTTP Headers: Add `Content-Type: application/json` and any authorization tokens.
--
-- Option B: PostgreSQL Trigger using pg_net (SQL alternative)
-- If you have the pg_net extension enabled, you can run this SQL:
-- 
-- CREATE OR REPLACE FUNCTION public.handle_new_notification_push()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM net.http_post(
--     url := 'https://your-domain.vercel.app/api/push-send',
--     headers := '{"Content-Type": "application/json"}'::jsonb,
--     body := json_build_object(
--       'record', row_to_json(NEW)
--     )::text
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- 
-- CREATE OR REPLACE TRIGGER trigger_push_notification
-- AFTER INSERT ON public.notifications
-- FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification_push();
-- =========================================================================
