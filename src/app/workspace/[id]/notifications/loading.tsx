import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      </header>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-2">
        {[1,2,3,4,5,6,7].map(i => (
          <div key={i} className="flex items-start gap-4 border rounded-lg p-4 bg-card">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-sm" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
