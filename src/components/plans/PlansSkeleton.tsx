import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PlansSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-9 w-64" />
              <Skeleton data-testid="plans-description-skeleton" className="h-5 w-full max-w-96" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(index => (
            <Card key={index} className="animate-pulse p-6">
              <div className="mb-6 text-center">
                <Skeleton className="mx-auto mb-2 h-6 w-24" />
                <Skeleton className="mx-auto mb-2 h-10 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="mb-6 space-y-2">
                {[1, 2, 3, 4, 5, 6].map(item => (
                  <div key={item} className="flex items-start gap-2">
                    <Skeleton className="mt-0.5 h-4 w-4 flex-shrink-0 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </Card>
          ))}
        </div>
        <div className="mt-12"><Skeleton className="h-24 w-full rounded-lg" /></div>
      </div>
    </div>
  );
}
