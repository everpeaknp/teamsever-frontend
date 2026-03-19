import { Skeleton } from '@/components/ui/skeleton';

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#E0E7FF] dark:bg-[#1E1B4B]/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F3F0FF] dark:bg-[#2E1065]/10 blur-[100px] rounded-full" />
      
      <div className="w-full max-w-[360px] relative z-10">
        {/* Brand Header Skeleton */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Skeleton className="w-9 h-9 rounded-[10px]" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-36 mx-auto" />
        </div>

        {/* Glass Card Skeleton */}
        <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-[32px] p-7 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12 mb-2" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-2xl mt-2" />
          <div className="flex items-center gap-3 py-4">
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
            <Skeleton className="h-3 w-20" />
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-4 w-40 mx-auto mt-8" />
      </div>
    </div>
  );
}
