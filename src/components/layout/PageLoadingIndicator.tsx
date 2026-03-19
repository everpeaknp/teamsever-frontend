'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function PageLoadingIndicator() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);

  useEffect(() => {
    // Show loading when path changes
    if (pathname !== previousPath) {
      setLoading(true);
      setPreviousPath(pathname);

      // Hide loading after a short delay (simulating page load)
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pathname, previousPath]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
      <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
    </div>
  );
}
