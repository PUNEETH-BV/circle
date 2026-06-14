-- ==========================================
-- Circle App — Full Database Schema
-- Tables first, then ALL policies after
-- ==========================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ==========================================
-- STEP 1: CREATE ALL TABLES
-- ==========================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

create table if not exists public.circles (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  avatar_url text,
  created_at timestamptz default now() not null
);

create table if not exists public.circle_members (
  id uuid default uuid_generate_v4() primary key,
  circle_id uuid references public.circles(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('admin', 'member')) default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(circle_id, user_id)
);

create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  circle_id uuid references public.circles(id) on delete cascade not null,
  name text not null,
  icon text default 'Folder',
  position int default 0 not null
);

create table if not exists public.files (
  id uuid default uuid_generate_v4() primary key,
  circle_id uuid references public.circles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null not null,
  name text not null,
  description text,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  download_count int default 0 not null,
  pinned boolean default false not null,
  created_at timestamptz default now() not null
);

create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  circle_id uuid references public.circles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null not null,
  title text default 'Untitled' not null,
  content jsonb default '{}'::jsonb,
  pinned boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.announcements (
  id uuid default uuid_generate_v4() primary key,
  circle_id uuid references public.circles(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null not null,
  title text not null,
  body text not null,
  created_at timestamptz default now() not null
);

-- ==========================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.categories enable row level security;
alter table public.files enable row level security;
alter table public.notes enable row level security;
alter table public.announcements enable row level security;

-- ==========================================
-- STEP 2.5: HELPER FUNCTIONS FOR POLICIES
-- (Defined as security definer to bypass RLS and prevent infinite recursion)
-- ==========================================

create or replace function public.get_my_circle_ids()
returns table (circle_id uuid) as $$
begin
  return query
  select cm.circle_id from public.circle_members cm
  where cm.user_id = auth.uid();
end;
$$ language plpgsql security definer;

create or replace function public.is_circle_admin(circle_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.circle_members cm
    where cm.circle_id = $1
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Allows any authenticated user to look up a circle by invite code (for joining)
create or replace function public.lookup_circle_by_invite_code(code text)
returns table (id uuid, name text, is_private boolean) as $$
begin
  return query
  select c.id, c.name, c.is_private from public.circles c
  where c.invite_code = code
  limit 1;
end;
$$ language plpgsql security definer;

-- ==========================================
-- STEP 3: ALL POLICIES (all tables exist now)
-- ==========================================

-- PROFILES
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- CIRCLES
create policy "Circles are viewable by members" on public.circles
  for select using (
    id in (select public.get_my_circle_ids())
    or created_by = auth.uid()
  );

create policy "Authenticated users can create circles" on public.circles
  for insert with check (auth.uid() = created_by);

create policy "Admins can update circles" on public.circles
  for update using (
    public.is_circle_admin(id)
  );

create policy "Admins can delete circles" on public.circles
  for delete using (
    public.is_circle_admin(id)
  );

-- CIRCLE MEMBERS
create policy "Members can view other members" on public.circle_members
  for select using (
    circle_id in (select public.get_my_circle_ids())
    or user_id = auth.uid()
  );

create policy "Authenticated users can join circles" on public.circle_members
  for insert with check (auth.uid() = user_id);

create policy "Admins can update members" on public.circle_members
  for update using (
    public.is_circle_admin(circle_id)
  );

create policy "Admins can remove members or members can leave" on public.circle_members
  for delete using (
    auth.uid() = user_id
    or public.is_circle_admin(circle_id)
  );

-- CATEGORIES
create policy "Categories viewable by circle members" on public.categories
  for select using (
    circle_id in (select public.get_my_circle_ids())
  );

create policy "Admins can manage categories" on public.categories
  for all using (
    public.is_circle_admin(circle_id)
  );

-- FILES
create policy "Files viewable by circle members" on public.files
  for select using (
    circle_id in (select public.get_my_circle_ids())
  );

create policy "Members can upload files" on public.files
  for insert with check (
    auth.uid() = uploaded_by
    and circle_id in (select public.get_my_circle_ids())
  );

create policy "Uploaders and admins can update files" on public.files
  for update using (
    auth.uid() = uploaded_by
    or public.is_circle_admin(circle_id)
  );

create policy "Uploaders and admins can delete files" on public.files
  for delete using (
    auth.uid() = uploaded_by
    or public.is_circle_admin(circle_id)
  );

-- NOTES
create policy "Notes viewable by circle members" on public.notes
  for select using (
    circle_id in (select public.get_my_circle_ids())
  );

create policy "Members can create notes" on public.notes
  for insert with check (
    auth.uid() = author_id
    and circle_id in (select public.get_my_circle_ids())
  );

create policy "Authors and admins can update notes" on public.notes
  for update using (
    auth.uid() = author_id
    or public.is_circle_admin(circle_id)
  );

create policy "Authors and admins can delete notes" on public.notes
  for delete using (
    auth.uid() = author_id
    or public.is_circle_admin(circle_id)
  );

-- ANNOUNCEMENTS
create policy "Announcements viewable by circle members" on public.announcements
  for select using (
    circle_id in (select public.get_my_circle_ids())
  );

create policy "Admins can create announcements" on public.announcements
  for insert with check (
    public.is_circle_admin(circle_id)
  );

create policy "Admins can delete announcements" on public.announcements
  for delete using (
    public.is_circle_admin(circle_id)
  );

-- ==========================================
-- STEP 4: FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-create "General" category when a circle is created
create or replace function public.handle_new_circle()
returns trigger as $$
begin
  insert into public.categories (circle_id, name, icon, position)
  values (new.id, 'General', 'Folder', 0);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_circle_created on public.circles;
create trigger on_circle_created
  after insert on public.circles
  for each row execute procedure public.handle_new_circle();

-- ==========================================
-- STEP 5: REALTIME
-- ==========================================
alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.circle_members;

-- ==========================================
-- STEP 6: BACKFILL PROFILES FOR EXISTING USERS
-- ==========================================
insert into public.profiles (id, full_name, avatar_url)
select 
  id,
  coalesce(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ),
  coalesce(
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data->>'picture'
  )
from auth.users
on conflict (id) do nothing;

-- ==========================================
-- STEP 7: FOLDERS & JOIN REQUESTS FEATURE
-- ==========================================

-- Add is_private column to circles table if it doesn't exist
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  file_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add folder_id to existing files table if it doesn't exist
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE;

-- JOIN REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(circle_id, user_id)
);

-- RLS for folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view folders" ON public.folders;
CREATE POLICY "Members can view folders" ON public.folders FOR SELECT
  USING (circle_id IN (
    SELECT public.get_my_circle_ids()
  ));

DROP POLICY IF EXISTS "Members can create folders" ON public.folders;
CREATE POLICY "Members can create folders" ON public.folders FOR INSERT
  WITH CHECK (circle_id IN (
    SELECT public.get_my_circle_ids()
  ));

DROP POLICY IF EXISTS "Creator or admin can update folder" ON public.folders;
CREATE POLICY "Creator or admin can update folder" ON public.folders FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.is_circle_admin(circle_id)
  );

DROP POLICY IF EXISTS "Creator or admin can delete folder" ON public.folders;
CREATE POLICY "Creator or admin can delete folder" ON public.folders FOR DELETE
  USING (
    created_by = auth.uid() OR
    public.is_circle_admin(circle_id)
  );

-- RLS for join_requests
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can see own requests" ON public.join_requests;
CREATE POLICY "User can see own requests" ON public.join_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can see circle requests" ON public.join_requests;
CREATE POLICY "Admins can see circle requests" ON public.join_requests FOR SELECT
  USING (public.is_circle_admin(circle_id));

DROP POLICY IF EXISTS "Users can create join requests" ON public.join_requests;
CREATE POLICY "Users can create join requests" ON public.join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update join requests" ON public.join_requests;
CREATE POLICY "Admins can update join requests" ON public.join_requests FOR UPDATE
  USING (public.is_circle_admin(circle_id));

-- Function to auto update folder file_count
CREATE OR REPLACE FUNCTION public.update_folder_file_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.folder_id IS NOT NULL THEN
    UPDATE public.folders SET file_count = file_count + 1,
    updated_at = NOW() WHERE id = NEW.folder_id;
  ELSIF TG_OP = 'DELETE' AND OLD.folder_id IS NOT NULL THEN
    UPDATE public.folders SET file_count = GREATEST(file_count - 1, 0),
    updated_at = NOW() WHERE id = OLD.folder_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_file_change_update_folder_count ON public.files;
CREATE TRIGGER on_file_change_update_folder_count
  AFTER INSERT OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.update_folder_file_count();

-- Realtime replication setup for folders and join_requests
alter publication supabase_realtime add table public.folders;
alter publication supabase_realtime add table public.join_requests;

