'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * NavigationLoader — shows a lightweight top progress bar immediately when the user
 * clicks any internal link, then hides once the new page has loaded.
 *
 * Keeps the sidebar mounted/visible so navigation doesn't feel like a full refresh.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const pathnameRef = useRef(pathname);

  // When the pathname changes, navigation is complete — hide the overlay
  useEffect(() => {
    setLoading(false);
    pathnameRef.current = pathname;
  }, [pathname]);

  // Intercept any click on an anchor that points to a different internal path
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only left-click without modifier keys (avoid triggering for new tabs/windows)
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor || !anchor.href || anchor.target) return;

      try {
        const url = new URL(anchor.href);
        const isSameOrigin = url.origin === window.location.origin;
        const isDifferentPath = url.pathname !== pathnameRef.current;
        // Don't trigger for hash-only changes (e.g. #features scrolling)
        const isHashOnly = url.pathname === pathnameRef.current && url.hash !== '';

        if (isSameOrigin && isDifferentPath && !isHashOnly) {
          setLoading(true);
        }
      } catch {
        // ignore invalid URLs
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed left-0 top-0 z-[9999] h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div className="h-full w-1/3 bg-gradient-to-r from-violet-500 to-indigo-500 animate-[navprogress_1s_ease-in-out_infinite]" />
    </div>
  );
}
