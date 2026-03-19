import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="flex h-full">
      {/* Channel list */}
      <div className="w-64 border-r p-4 space-y-3 flex-shrink-0">
        <Skeleton className="h-5 w-20 mb-4" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={`flex gap-3 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-1 max-w-xs">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
