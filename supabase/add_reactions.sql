-- SQL migration script to add reactions to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Example JSON structure for reactions:
-- {
--   "👍": ["user_id_1", "user_id_2"],
--   "🎉": ["user_id_3"]
-- }
