import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="grid lg:grid-cols-2 gap-6 flex-1">
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full rounded" />
        </div>
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-48 w-full rounded" />
        </div>
      </div>
    </div>
  );
}
