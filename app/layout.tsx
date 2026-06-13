import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Circle — Collaborate with your team',
  description: 'Share files, write notes, and stay connected — all in one place.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '0.75rem',
            },
          }}
        />
      </body>
    </html>
  );
}
