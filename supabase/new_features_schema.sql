-- 1. ANNOUNCEMENT COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcement_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 2. CALENDAR EVENTS TABLE
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

-- Enable RLS
ALTER TABLE public.circle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 3. KANBAN TASKS TABLE
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

-- Enable RLS
ALTER TABLE public.circle_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 4. GROUP CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.circle_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.circle_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 5. NOTE VERSIONS TABLE (Revision History)
CREATE TABLE IF NOT EXISTS public.note_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 6. REALTIME REPLICATION CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_versions;
