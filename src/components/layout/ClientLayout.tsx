'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import dynamic from 'next/dynamic';
import { SearchProvider } from '@/components/search/SearchProvider';
import { NavigationLoader } from '@/components/layout/NavigationLoader';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useEffect } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';

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
const TaskDetailSidebar = dynamic(
  () => import('@/components/tasks/TaskDetailSidebar').then(mod => mod.TaskDetailSidebar),
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
  const { user, setUser } = useAuthStore();

  // Hydrate auth store on every page load so the user object is always available.
  // First populate from localStorage immediately (fast, no flicker), then fetch
  // the full profile from the API to get the latest profilePicture.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    const userAvatar = localStorage.getItem('userAvatar');

    // Immediately hydrate from localStorage so components don't wait
    if (userId && userName && userEmail) {
      setUser({ _id: userId, name: userName, email: userEmail, profilePicture: userAvatar || undefined });
    }

    // Then fetch fresh profile data from the API (includes latest profilePicture)
    if (userId) {
      api.get('/users/profile')
        .then(res => {
          const userData = res.data.data || res.data;
          if (userData?._id) {
            const freshAvatar = userData.profilePicture || userData.avatar;
            if (freshAvatar) {
              localStorage.setItem('userAvatar', freshAvatar);
            }
            if (userData.name) {
              localStorage.setItem('userName', userData.name);
            }
            setUser({
              _id: userData._id,
              name: userData.name,
              email: userData.email,
              profilePicture: userData.profilePicture,
              avatar: userData.avatar,
            });
          }
        })
        .catch(() => {
          // Silently ignore — the localStorage fallback is already set above
        });
    }
  }, [setUser]); // Only run once on mount


  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      // Sync the permission state in the store
      syncPermission();

      // If already granted, ensure FCM is initialized and token is sent to backend
      if (Notification.permission === 'granted') {
        initializeFCM().catch(err => {
          console.error('Failed to auto-initialize FCM:', err);
        });
      }
    }
  }, [initializeFCM, syncPermission]);

  return (
    <SearchProvider>
      <NavigationLoader />
      <PageLoadingIndicator />
      <TaskDetailSidebar />
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
