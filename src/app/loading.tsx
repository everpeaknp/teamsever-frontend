import { Skeleton } from '@/components/ui/skeleton';

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#0B0E14] overflow-x-hidden">
      {/* Nav skeleton */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-[24px] px-6 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-[10px]" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      </nav>

      {/* Hero skeleton */}
      <main className="pt-32 lg:pt-48 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <Skeleton className="h-7 w-56 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full max-w-sm" />
              <Skeleton className="h-16 w-full max-w-xs" />
            </div>
            <Skeleton className="h-20 w-full max-w-lg" />
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-12 w-36 rounded-2xl" />
              <Skeleton className="h-12 w-28 rounded-2xl" />
            </div>
          </div>
          <Skeleton className="h-80 w-full rounded-[32px]" />
        </div>
      </main>
    </div>
  );
}
