import { Skeleton } from '@/components/ui/skeleton';

// Generic workspace inner-page skeleton that works for spaces, lists, analytics, etc.
export default function WorkspacePageLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>

      {/* Task rows */}
      <div className="space-y-2">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-40 flex-1" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-3 w-20 hidden md:block" />
          <Skeleton className="h-3 w-16 hidden lg:block" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-card">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-6 w-6 rounded-full hidden md:block" />
            <Skeleton className="h-4 w-20 hidden lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
