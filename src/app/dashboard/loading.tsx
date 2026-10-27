import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 hidden sm:block" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
      </header>

      <div aria-hidden="true" className="h-[calc(6rem+env(safe-area-inset-top))] sm:h-[calc(4rem+env(safe-area-inset-top))]" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-44 mb-2" />
          <Skeleton className="h-5 w-60" />
        </div>

        {/* Plan card skeleton */}
        <div className="border rounded-lg p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div><Skeleton className="h-6 w-28 mb-2" /><Skeleton className="h-4 w-20" /></div>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="border rounded-lg p-4 space-y-3 animate-pulse">
              <div className="flex items-start gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-28 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
