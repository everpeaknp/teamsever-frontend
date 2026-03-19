import { Skeleton } from '@/components/ui/skeleton';

export default function TimeTrackingLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-20" />)}
        </div>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
            {[1,2,3,4,5].map(j => <Skeleton key={j} className="h-4 w-20 flex-1" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
