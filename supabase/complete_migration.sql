-- ============================================================
-- CIRCLE APP - COMPLETE MIGRATION SCRIPT
-- Run this entire script in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================================

-- --------------------------------------------------------
-- 1. ADD REACTIONS COLUMN TO ANNOUNCEMENTS
-- --------------------------------------------------------
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- --------------------------------------------------------
-- 2. ADD POLL COLUMNS TO ANNOUNCEMENTS
-- --------------------------------------------------------
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS poll_question TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS poll_options JSONB DEFAULT '[]'::jsonb;

-- --------------------------------------------------------
-- 3. ANNOUNCEMENT COMMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcement_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by circle members" ON public.announcement_comments;
CREATE POLICY "Comments viewable by circle members" ON public.announcement_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.announcements a ON a.circle_id = m.circle_id
            WHERE a.id = announcement_comments.announcement_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can post comments" ON public.announcement_comments;
CREATE POLICY "Members can post comments" ON public.announcement_comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.announcements a ON a.circle_id = m.circle_id
            WHERE a.id = announcement_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.announcement_comments;
CREATE POLICY "Authors can delete own comments" ON public.announcement_comments
    FOR DELETE USING (auth.uid() = author_id);


-- --------------------------------------------------------
-- 4. CALENDAR EVENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.circle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events viewable by circle members" ON public.circle_events;
CREATE POLICY "Events viewable by circle members" ON public.circle_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = circle_events.circle_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage events" ON public.circle_events;
CREATE POLICY "Admins can manage events" ON public.circle_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = circle_events.circle_id AND user_id = auth.uid() AND role = 'admin'
        )
    );


-- --------------------------------------------------------
-- 5. KANBAN TASKS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo' NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.circle_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks viewable by circle members" ON public.circle_tasks;
CREATE POLICY "Tasks viewable by circle members" ON public.circle_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = circle_tasks.circle_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can manage tasks" ON public.circle_tasks;
CREATE POLICY "Members can manage tasks" ON public.circle_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = circle_tasks.circle_id AND user_id = auth.uid()
        )
    );


-- --------------------------------------------------------
-- 6. GROUP CHAT MESSAGES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.circle_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat messages viewable by circle members" ON public.circle_chat_messages;
CREATE POLICY "Chat messages viewable by circle members" ON public.circle_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = circle_chat_messages.circle_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can send chat messages" ON public.circle_chat_messages;
CREATE POLICY "Members can send chat messages" ON public.circle_chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = circle_chat_messages.circle_id AND user_id = auth.uid()
        )
    );


-- --------------------------------------------------------
-- 7. NOTE VERSIONS TABLE (Revision History)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.note_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Note versions viewable by circle members" ON public.note_versions;
CREATE POLICY "Note versions viewable by circle members" ON public.note_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.notes n ON n.circle_id = m.circle_id
            WHERE n.id = note_versions.note_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can create note versions" ON public.note_versions;
CREATE POLICY "Members can create note versions" ON public.note_versions
    FOR INSERT WITH CHECK (
        auth.uid() = updated_by AND
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.notes n ON n.circle_id = m.circle_id
            WHERE n.id = note_id AND m.user_id = auth.uid()
        )
    );


-- --------------------------------------------------------
-- 8. ASSIGNMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assignments viewable by circle members" ON public.assignments;
CREATE POLICY "Assignments viewable by circle members" ON public.assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = assignments.circle_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;
CREATE POLICY "Admins can manage assignments" ON public.assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.circle_members 
            WHERE circle_id = assignments.circle_id AND user_id = auth.uid() AND role = 'admin'
        )
    );


-- --------------------------------------------------------
-- 9. ASSIGNMENT SUBMISSIONS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'submitted')) DEFAULT 'pending' NOT NULL,
    file_path TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(assignment_id, user_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Submissions viewable by circle members" ON public.assignment_submissions;
CREATE POLICY "Submissions viewable by circle members" ON public.assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.assignments a ON a.circle_id = m.circle_id
            WHERE a.id = assignment_submissions.assignment_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own submissions" ON public.assignment_submissions;
CREATE POLICY "Users can manage own submissions" ON public.assignment_submissions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- --------------------------------------------------------
-- 10. NOTE COMMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.note_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Note comments viewable by circle members" ON public.note_comments;
CREATE POLICY "Note comments viewable by circle members" ON public.note_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.notes n ON n.circle_id = m.circle_id
            WHERE n.id = note_comments.note_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can post note comments" ON public.note_comments;
CREATE POLICY "Members can post note comments" ON public.note_comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members m
            JOIN public.notes n ON n.circle_id = m.circle_id
            WHERE n.id = note_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authors can delete own note comments" ON public.note_comments;
CREATE POLICY "Authors can delete own note comments" ON public.note_comments
    FOR DELETE USING (auth.uid() = author_id);


-- --------------------------------------------------------
-- 11. PUSH SUBSCRIPTIONS TABLE (Web Notifications)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- --------------------------------------------------------
-- 12. ENABLE REALTIME ON ALL NEW TABLES
-- --------------------------------------------------------
DO $$
BEGIN
  -- announcement_comments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- circle_events
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- circle_tasks
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- circle_chat_messages
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- note_versions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.note_versions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- assignments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- assignment_submissions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  -- note_comments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.note_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- MIGRATION COMPLETE ✓
-- ============================================================
