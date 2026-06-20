-- 1. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 2. ASSIGNMENT SUBMISSIONS TABLE
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

-- Enable RLS
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 3. NOTE COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.note_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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


-- 4. ALTER ANNOUNCEMENTS TO ADD POLL COLUMNS
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS poll_question TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS poll_options JSONB DEFAULT '[]'::jsonb;


-- 5. REALTIME REPLICATION CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_comments;
