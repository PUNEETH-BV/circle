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
  is_private: boolean;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: 'admin' | 'member';
  can_upload: boolean;
  is_blocked?: boolean;
  blocked_until?: string | null;
  block_reason?: string | null;
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
  folder_id?: string | null;
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
  media?: { url: string; type: 'image' | 'video' }[];
  reactions?: Record<string, string[]>;
  poll_question?: string | null;
  poll_options?: { id: string; text: string; votes: string[] }[];
  created_at: string;
  author?: Profile;
}

export interface Folder {
  id: string;
  circle_id: string;
  category_id?: string | null;
  created_by: string;
  name: string;
  description?: string;
  pinned: boolean;
  file_count: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  files?: FileRecord[];
}

export interface JoinRequest {
  id: string;
  circle_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  profile?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  circle_id?: string | null;
  type: 'join_approved' | 'join_rejected' | 'removed_from_circle' | 'new_join_request' | 'file_uploaded' | 'new_note' | 'new_member';
  title: string;
  body?: string | null;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  circle_id: string;
  event_type: string;
  filter: any;
  created_at: string;
}
