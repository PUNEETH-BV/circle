# 🔵 Circle

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-blueviolet?style=flat-square&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

Circle is a modern, private collaboration platform designed for teams, clubs, student groups, and organization units to coordinate work, share files, collaborate on documents, and stay aligned in real-time. 

With private invitation-only access, granular permissions, nested folders, collaborative notes, announcements, and an intelligent notification system, Circle provides all the essential tools for self-organized communities without the clutter of public platforms.

---

## ✨ Features

- **🔒 Private Circles**: Invitation-only workspaces. Join using unique invite codes (with quick QR codes) and gain access only upon admin approval.
- **📂 Document & File Sharing**: Organize files in custom categories and nested directories. Upload images, videos, PDFs, and general files.
- **🔗 Direct Sharing Links**: Generate direct shareable links to specific files or folders. Clicking a link takes users directly to that file/folder within the circle.
- **📝 Collaborative Notes**: A rich-text workspace note editor (powered by TipTap) for docs, wikis, and team guides.
- **📢 Announcements**: Broadcast news, updates, or instructions to circle members. Attach photos or video clips directly to your announcements.
- **🔔 Real-time Notifications**: Custom sliding notification panel and instant toast notifications. Get notified of new announcements, file uploads, member requests, and permissions changes in real-time.
- **🛡️ Custom Role & Access Control**: Circle creators can control who can upload files (`can_upload` permission) or manage circle settings.
- **🏷️ Preset Categories**: Admin quick-add tags (📝 Assignments, 📚 Resources, 💬 General, etc.) to instantly organize directories.
- **🔍 Global Search**: Search folders, files, and collaborative notes in real-time inside the circle.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
* **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime subscriptions, Auth, Storage buckets)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS variables
* **Rich Editor**: [TipTap](https://tiptap.dev/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Notifications**: [Sonner](https://react-hot-toast.com/toast)
* **QR Code**: `qrcode.react`

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) installed.

### 1. Clone the repository

```bash
git clone https://github.com/PUNEETH-BV/circle.git
cd circle
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Supabase Database & Auth

1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL script from [supabase/schema.sql](file:///d:/circle/supabase/schema.sql) in your Supabase SQL Editor. This sets up all the tables, relations, row-level security (RLS) policies, storage buckets, and notification triggers.
3. Configure the following Auth providers in Supabase if needed:
   - Email/Password (Sign Up / Log In)
   - Google OAuth (optional)

### 4. Configure Environment Variables

Create a `.env.local` file in the root of the project:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 🗄️ Database Schema Details

The database is built on PostgreSQL with Row Level Security (RLS) enabled for all tables.
- **`profiles`**: User accounts mapped to Supabase authentication.
- **`circles`**: Group directories containing an invitation code and privacy flags.
- **`circle_members`**: Link table mapping users to circles with permissions (`role`, `can_upload`, `approved`).
- **`folders`**: Nested directories labeled under distinct categories.
- **`files`**: User-uploaded files containing names, paths, sizes, and file type information.
- **`notes`**: Collaborative rich text documents.
- **`announcements`**: Broadcasted updates, supporting embedded media links.
- **`notifications`**: User notifications triggered by platform activity.

---

## 🔗 Links

- **Repository**: [https://github.com/PUNEETH-BV/circle](https://github.com/PUNEETH-BV/circle)
- **Deployment**: *(Vercel deployment link coming soon!)*
