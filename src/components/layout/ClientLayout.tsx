'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import dynamic from 'next/dynamic';
import { SearchProvider } from '@/components/search/SearchProvider';
import { NavigationLoader } from '@/components/layout/NavigationLoader';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useEffect } from 'react';
import { api } from '@/lib/axios';

// Dynamic imports so these heavy components are excluded from pages that don't need them
const AppSidebar = dynamic(
  () => import('@/components/sidebar/AppSidebar').then(mod => mod.AppSidebar),
  {
    ssr: false,
    loading: () => <div className="w-[300px] h-screen bg-background border-r border-border animate-pulse flex-shrink-0" />,
  }
);
const Header = dynamic(
  () => import('@/components/Header').then(mod => mod.Header),
  { ssr: false }
);
const GlobalTimer = dynamic(
  () => import('@/components/layout/GlobalTimer'),
  { ssr: false }
);
const PageLoadingIndicator = dynamic(
  () => import('@/components/layout/PageLoadingIndicator').then(mod => mod.PageLoadingIndicator),
  { ssr: false }
);

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/join' ||
    pathname?.startsWith('/auth/');

  const isDashboardPage = pathname === '/dashboard';
  const isSuperAdminPage = pathname?.startsWith('/super-admin');
  const isStandalonePage = isDashboardPage || isSuperAdminPage || pathname === '/';
  const showShell = !isAuthPage && !isStandalonePage;

  const { initializeFCM, syncPermission } = useNotificationStore();

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      // Sync the permission state in the store
      syncPermission();

      // If already granted, ensure FCM is initialized and token is sent to backend
      if (Notification.permission === 'granted') {
        initializeFCM();
      }
    }
  }, [initializeFCM, syncPermission]);

  return (
    <SearchProvider>
      <NavigationLoader />
      <PageLoadingIndicator />
      <Toaster position="top-right" richColors />
      {showShell && <GlobalTimer />}

      {showShell ? (
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="hidden lg:flex">
            <AppSidebar />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto bg-background">
              {children}
            </main>
          </div>
        </div>
      ) : (
        <main className="min-h-screen">{children}</main>
      )}
    </SearchProvider>
  );
}
