export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-indigo-600 rounded-full" />
            </div>
            <span className="text-2xl font-semibold">Circle</span>
          </div>
          <h1 className="text-4xl font-semibold mb-4">Collaborate with your team</h1>
          <p className="text-indigo-200 text-lg">Share files, write notes, and stay connected — all in one place.</p>
        </div>
      </div>
      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
