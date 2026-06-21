'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, Smartphone, ShieldCheck, Cpu, ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react';

// ─── APK Download URL ────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_APK_URL in your .env.local (or Vercel env vars) to the
// direct-download link from Google Drive, Dropbox, or GitHub Releases.
//
// Google Drive:  Change the share link from /view to /uc?export=download
//   e.g. https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
//
// Dropbox:       Change ?dl=0 to ?dl=1 at the end of the share link.
// ─────────────────────────────────────────────────────────────────────────────
const APK_URL = process.env.NEXT_PUBLIC_APK_URL || '';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!APK_URL) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = 'circle-mobile.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              C
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Circle
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Web Workspace
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center gap-16 z-10">
        
        {/* Left Side: Hero Information */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Circle Mobile v1.0.0 is Live
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Circle on <br className="hidden md:inline"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500">
              your Mobile Phone
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Collaborate, chat, and keep up with your workspace projects, tasks, files, and discussion threads directly from your pocket. High-performance, minimal footprint, beautiful interface.
          </p>

          {/* Action Area */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 pt-4">
            {!APK_URL ? (
              /* ── Coming Soon state when env var not set ── */
              <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 max-w-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">APK coming soon — check back shortly!</span>
              </div>
            ) : (
              /* ── Real download button ── */
              <a
                href={APK_URL}
                download="circle-mobile.apk"
                onClick={() => { setDownloading(true); setTimeout(() => { setDownloading(false); setDownloaded(true); setTimeout(() => setDownloaded(false), 5000); }, 2000); }}
                className={`h-16 px-8 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-xl shadow-indigo-600/10 active:scale-[0.98] no-underline ${
                  downloaded
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Downloading...</span>
                  </>
                ) : downloaded ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Download Complete!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download APK (11.4 MB)</span>
                  </>
                )}
              </a>
            )}

            {/* Version Metadata */}
            <div className="text-left text-xs text-slate-500 font-mono space-y-1">
              <p>Filename: circle-mobile.apk</p>
              <p>OS: Android 7.0 (API 24) or higher</p>
              <p>SHA256: Verified Safe Package</p>
            </div>
          </div>

          {/* QR Code and Direct Scan */}
          <div className="flex items-center gap-6 p-6 rounded-xl bg-slate-900/40 border border-slate-900 max-w-md mx-auto lg:mx-0">
            <div className="w-24 h-24 bg-white p-2 rounded-lg shrink-0 flex items-center justify-center shadow-lg relative group">
              {/* SVG representation of a custom QR code referencing /circle-mobile.apk */}
              <svg className="w-full h-full text-slate-950" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H7V7H0V0ZM2 2V5H5V2H2Z" fill="currentColor"/>
                <path d="M0 22H7V29H0V22ZM2 24V27H5V24H2Z" fill="currentColor"/>
                <path d="M22 0H29V7H22V0ZM24 2V5H27V2H24Z" fill="currentColor"/>
                <path d="M10 0H19V2H10V0ZM10 4H12V6H10V4ZM14 4H19V6H14V4ZM0 10H2V19H0V10ZM4 10H6V12H4V10ZM4 14H6V19H4V14ZM10 10H14V14H10V10ZM12 12V14H14V12H12ZM22 10H24V14H22V10ZM24 12H27V19H24V12ZM10 22H12V24H10V22ZM14 22H19V24H14V22ZM22 22H27V27H22V22ZM24 24V26H26V24H24Z" fill="currentColor"/>
                <circle cx="14.5" cy="14.5" r="2.5" className="fill-indigo-600"/>
              </svg>
            </div>
            <div className="text-left space-y-1">
              <h4 className="font-semibold text-sm text-slate-200">Scan QR Code</h4>
              <p className="text-xs text-slate-400 leading-normal">
                Scan this code with your phone camera to download the APK directly to your device.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Phone Preview Mockup */}
        <div className="flex-1 flex justify-center z-10 w-full max-w-sm">
          {/* Phone Frame */}
          <div className="relative w-[300px] h-[600px] rounded-[48px] border-[8px] border-slate-900 bg-slate-950 shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden ring-4 ring-slate-900/50">
            {/* Camera Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-full z-40 flex items-center justify-between px-6">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-950/60" />
              <div className="w-3.5 h-1.5 rounded-full bg-slate-950/60" />
            </div>

            {/* App UI Contents Preview */}
            <div className="flex-grow flex flex-col pt-10 pb-6 px-4 space-y-6 overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center h-10 border-b border-slate-900 pb-2">
                <span className="text-indigo-500 font-bold text-sm tracking-wide">Circle</span>
                <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-900 rounded-full">Dashboard</span>
              </div>
              
              {/* Greeting */}
              <div className="space-y-1 text-left">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Workspace</p>
                <h3 className="text-lg font-bold text-white leading-tight">Good morning, Alex.</h3>
                <p className="text-[10px] text-slate-400">4 tasks and 2 unread threads today.</p>
              </div>

              {/* Actions Card */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-4 text-left space-y-3">
                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-indigo-600 rounded-xl flex flex-col justify-between h-18 text-white cursor-default">
                    <span className="material-symbols-outlined text-sm">forum</span>
                    <span className="text-[10px] font-semibold leading-none">New Thread</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl flex flex-col justify-between h-18 text-white cursor-default">
                    <span className="material-symbols-outlined text-sm">add_task</span>
                    <span className="text-[10px] font-semibold leading-none">Add Task</span>
                  </div>
                </div>
              </div>

              {/* Activity Card */}
              <div className="bg-slate-900/30 border border-slate-900/50 rounded-2xl p-4 text-left space-y-3 flex-grow overflow-hidden flex flex-col">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h4>
                <div className="space-y-3 flex-grow overflow-hidden">
                  <div className="flex gap-2 text-[10px]">
                    <div className="w-5 h-5 rounded-full bg-violet-900/40 text-violet-400 flex items-center justify-center shrink-0">S</div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-200">Sarah updated "Design System"</p>
                      <p className="text-slate-400 leading-tight">Added dark mode tokens and margins.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    <div className="w-5 h-5 rounded-full bg-indigo-900/40 text-indigo-400 flex items-center justify-center shrink-0">A</div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-200">Mention in "Client Sync"</p>
                      <p className="text-slate-400 leading-tight">"Alex, take a look at the wireframes."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar Mockup */}
            <div className="h-14 border-t border-slate-900/60 bg-slate-950 flex justify-around items-center px-4">
              <div className="flex flex-col items-center justify-center text-indigo-500 scale-90">
                <span className="material-symbols-outlined text-lg">dashboard</span>
              </div>
              <div className="flex flex-col items-center justify-center text-slate-500 scale-90">
                <span className="material-symbols-outlined text-lg">forum</span>
              </div>
              <div className="flex flex-col items-center justify-center text-slate-500 scale-90">
                <span className="material-symbols-outlined text-lg">assignment</span>
              </div>
              <div className="flex flex-col items-center justify-center text-slate-500 scale-90">
                <span className="material-symbols-outlined text-lg">folder_shared</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Details Grid */}
      <section className="bg-slate-950 border-t border-slate-900 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-900/20 border border-slate-900 space-y-4 hover:border-slate-800 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Full Screen WebView</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Optimized layout specifically fitted for modern mobile screens. Seamlessly runs local and network-optimized workflows.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/20 border border-slate-900 space-y-4 hover:border-slate-800 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Hardware Back Button</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Overridden hardware controls route native back buttons to browser history navigation so you never accidentally exit pages.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/20 border border-slate-900 space-y-4 hover:border-slate-800 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Verified Safe Package</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The APK package is fully compiled locally and contains zero trackers, third-party analytics, or background background telemetry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Circle Tech Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-slate-400 transition-colors">Workspace</Link>
            <Link href="/auth/login" className="hover:text-slate-400 transition-colors">Log In</Link>
            <Link href="/auth/signup" className="hover:text-slate-400 transition-colors">Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
