import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="flex h-full">
      {/* Settings sidebar */}
      <div className="w-56 border-r p-4 space-y-2 flex-shrink-0">
        <Skeleton className="h-5 w-20 mb-4" />
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
      </div>
      {/* Settings content */}
      <div className="flex-1 p-6 space-y-6">
        <div>
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="border rounded-lg p-6 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-6 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
