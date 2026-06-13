export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-2/3 rounded skeleton" />
          <div className="h-3 w-1/3 rounded skeleton" />
        </div>
      </div>
      <div className="h-3 w-full rounded skeleton" />
      <div className="h-3 w-4/5 rounded skeleton" />
      <div className="flex gap-4 pt-2">
        <div className="h-3 w-16 rounded skeleton" />
        <div className="h-3 w-16 rounded skeleton" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-100">
      <div className="w-10 h-10 rounded-lg skeleton" />
      <div className="space-y-2 flex-1">
        <div className="h-4 w-1/3 rounded skeleton" />
        <div className="h-3 w-1/4 rounded skeleton" />
      </div>
      <div className="h-8 w-20 rounded-lg skeleton" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
