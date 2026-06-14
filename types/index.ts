export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Circle {
  id: string;
  name: string;
  description?: string;
  invite_code: string;
  created_by: string;
  avatar_url?: string;
  created_at: string;
  member_count?: number;
  file_count?: number;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: Profile;
}

export interface Category {
  id: string;
  circle_id: string;
  name: string;
  icon?: string;
  position: number;
}

export interface FileRecord {
  id: string;
  circle_id: string;
  category_id?: string | null;
  uploaded_by: string;
  name: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  download_count: number;
  pinned: boolean;
  created_at: string;
  uploader?: Profile;
  category?: Category;
}

export interface Note {
  id: string;
  circle_id: string;
  category_id?: string | null;
  author_id: string;
  title: string;
  content: any;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  category?: Category;
}

export interface Announcement {
  id: string;
  circle_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  author?: Profile;
}
