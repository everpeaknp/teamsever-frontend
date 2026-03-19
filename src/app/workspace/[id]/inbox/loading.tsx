import { Skeleton } from '@/components/ui/skeleton';

export default function InboxLoading() {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex gap-2">
        {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <div className="space-y-2">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-start gap-4 border rounded-lg p-4 bg-card">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
