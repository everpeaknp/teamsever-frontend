'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import {
  Inbox,
  Bell,
  Settings as SettingsIcon,
  Plus,
  Star,
  ChevronDown,
  Loader2,
  User,
  Users,
  BarChart3,
  FileText,
  MoreHorizontal,
  MessageSquare,
  Palette,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useUIStore } from '@/store/useUIStore';
import { useModalStore } from '@/store/useModalStore';
import { usePermissions, useWorkspaceContext } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useThemeStore, accentColors, getGradientColor } from '@/store/useThemeStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { UserAvatar } from '@/components/ui/user-avatar';
import { HierarchyItemComponent } from './HierarchyItem';
import { CreateItemModal } from '@/components/modals/CreateItemModal';
import { EditSpaceModal } from '@/components/modals/EditSpaceModal';
import { EditFolderModal } from '@/components/modals/EditFolderModal';
import { EditListModal } from '@/components/modals/EditListModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/axios';
import UpgradeButton from '@/components/subscription/UpgradeButton';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const favoriteIds = useUIStore(state => state.favoriteIds);
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);
  const { openModal, setOnSuccess } = useModalStore();
  const { can, isAdmin, isOwner } = usePermissions();
  const { setWorkspaceContext } = useWorkspaceContext();
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const syncPermission = useNotificationStore(state => state.syncPermission);
  const accentColor = useThemeStore(state => state.accentColor);
  const { resolvedTheme } = useTheme();
  const themeMode = resolvedTheme || 'light';
  const { subscription, nextPlan } = useSubscription();
  const { whatsappNumber, systemName, accentColor: systemAccentColor, logoUrl } = useSystemSettings();
  
  const sidebarWidth = useUIStore(state => state.sidebarWidth);
  const setSidebarWidth = useUIStore(state => state.setSidebarWidth);
  const isResizing = React.useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsResizingState(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    setIsResizingState(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      // Subtract the left icon bar width (64px) to get the sidebar's relative width
      const newWidth = e.clientX - 64;
      setSidebarWidth(newWidth);
    }
  }, [setSidebarWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(280);
  }, [setSidebarWidth]);

  // Use workspace store instead of local state
  const { hierarchy, loading, error, fetchHierarchy } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [isResizingState, setIsResizingState] = useState(false);

  // Extract workspaceId from URL
  let workspaceId = params?.id as string;

  // Hydrate auth store from localStorage if user is not yet loaded (e.g. after page refresh)
  const { setUser } = useAuthStore();
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      const userEmail = localStorage.getItem('userEmail');
      if (userId && userName && userEmail) {
        const userAvatar = localStorage.getItem('userAvatar');
        setUser({ _id: userId, name: userName, email: userEmail, profilePicture: userAvatar || undefined });
      }
    }
  }, [user, setUser]);

  if (!workspaceId && pathname) {
    const workspaceMatch = pathname.match(/\/workspace\/([^\/]+)/);
    if (workspaceMatch) {
      workspaceId = workspaceMatch[1];
    }
  }

  // Chat unread counts - Optimized selectors
  const groupChatUnread = useChatStore(state => 
    workspaceId ? (state.rooms[`workspace_${workspaceId}`]?.unreadCount || 0) : 0
  );
  
  const inboxUnread = useChatStore(state => 
    Object.values(state.rooms)
      .filter(room => room.type === 'direct')
      .reduce((total, room) => total + (room.unreadCount || 0), 0)
  );

  // Use system accent color if user hasn't set one or as base
  const themeColor = accentColors[accentColor as keyof typeof accentColors] || accentColors[systemAccentColor as keyof typeof accentColors] || accentColors.mint;
  const gradientStyle = getGradientColor(themeColor);

  // Load user info from localStorage
  useEffect(() => {
    setIsClient(true);
    // Sync notification permission
    syncPermission();
  }, [syncPermission]);

  // Listen for workspace updates to refresh logo/name
  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      if (workspaceId) {
        fetchHierarchy(workspaceId, true);
      }
    };

    window.addEventListener('workspace-updated', handleWorkspaceUpdate);
    return () => window.removeEventListener('workspace-updated', handleWorkspaceUpdate);
  }, [workspaceId, fetchHierarchy]);

  // Sync unread counts on mount
  useEffect(() => {
    const syncUnreadCounts = async () => {
      if (!isClient || !user?._id) return;
      
      try {
        const { createRoom } = useChatStore.getState();
        
        // 1. Sync Inbox (DMs)
        try {
          const response = await api.get('/dm');
          const conversations = response.data.data || [];
          
          conversations.forEach((conv: any) => {
            if (conv.unreadCount > 0) {
              // Ensure room exists
              createRoom(conv._id, 'direct', undefined, conv.participants.map((p: any) => p._id));
              // Update unread count manually
              const rooms = useChatStore.getState().rooms;
              if (rooms[conv._id]) {
                useChatStore.setState({
                  rooms: {
                    ...rooms,
                    [conv._id]: {
                      ...rooms[conv._id],
                      unreadCount: conv.unreadCount
                    }
                  }
                });
              }
            }
          });
        } catch (error) {
          console.error('[AppSidebar] Failed to sync inbox unread:', error);
        }

        // 2. Sync Workspace Group Chat
        if (workspaceId) {
          try {
            const chatRes = await api.get(`/workspaces/${workspaceId}/chat/unread`);
            const chatUnreadCount = chatRes.data?.data?.unreadCount || 0;
            
            if (chatUnreadCount > 0) {
              const roomId = `workspace_${workspaceId}`;
              createRoom(roomId, 'workspace', workspaceId);
              const rooms = useChatStore.getState().rooms;
              if (rooms[roomId]) {
                useChatStore.setState({
                  rooms: {
                    ...rooms,
                    [roomId]: {
                      ...rooms[roomId],
                      unreadCount: chatUnreadCount
                    }
                  }
                });
              }
            }
          } catch (error) {
            console.error('[AppSidebar] Failed to sync group chat unread:', error);
          }
        }
      } catch (error) {
        console.error('[AppSidebar] Failed to outer sync unread counts:', error);
      }
    };

    syncUnreadCounts();
  }, [isClient, user?._id, workspaceId]);

  // Fetch all workspaces for switcher
  const fetchAllWorkspaces = async () => {
    try {
      const response = await api.get('/workspaces');
      setAllWorkspaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const handleWorkspaceClick = () => {
    setShowWorkspaceSwitcher(true);
    fetchAllWorkspaces();
  };

  const switchWorkspace = (newWorkspaceId: string) => {
    setShowWorkspaceSwitcher(false);
    router.push(`/workspace/${newWorkspaceId}`);
  };

  // Fetch hierarchy using the optimized endpoint
  const loadHierarchy = useCallback(async () => {
    if (!workspaceId) return;

    if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      console.error('Invalid workspace ID format:', workspaceId);
      return;
    }

    try {
      // Fetch workspace details for context
      const workspaceRes = await api.get(`/workspaces/${workspaceId}`);
      const workspace = workspaceRes.data.data || workspaceRes.data;

      if (!workspace || !workspace._id) {
        throw new Error('Workspace not found');
      }

      // Set workspace context for permissions
      if (user?._id) {
        const userMember = workspace.members?.find((m: any) => m.user === user._id || m.user._id === user._id);
        if (userMember) {
          setWorkspaceContext(workspace._id, userMember.role);
        }
      }

      // Use the optimized hierarchy endpoint
      await fetchHierarchy(workspaceId);

      // Auto-expand all spaces
      const { hierarchy: currentHierarchy } = useWorkspaceStore.getState();
      if (currentHierarchy?.spaces) {
        const spaceIds = currentHierarchy.spaces.map(s => s._id);
        const { expandedIds } = useUIStore.getState();
        const newSpaceIds = spaceIds.filter(id => !expandedIds.includes(id));
        if (newSpaceIds.length > 0) {
          useUIStore.getState().expandAll(newSpaceIds);
          console.log('[AppSidebar] Auto-expanded spaces:', newSpaceIds);
        }
      }
    } catch (err: any) {
      console.error('Failed to load hierarchy:', err);
      
      if (err.response?.status === 404) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    }
  }, [workspaceId, user?._id, setWorkspaceContext, fetchHierarchy, router]);

  useEffect(() => {
    if (workspaceId) {
      loadHierarchy();
      setOnSuccess(loadHierarchy);
    }
  }, [workspaceId, loadHierarchy, setOnSuccess]);

  const favoriteItems = hierarchy?.spaces
    .flatMap((space) => [
      space,
      ...(space.folders || []),
      ...(space.lists || []), // Changed from listsWithoutFolder to lists
    ])
    .filter((item) => favoriteIds.includes(item._id)) || [];

  const handleCreateSpace = () => {
    if (workspaceId && hierarchy) {
      openModal('space', workspaceId, 'workspace', hierarchy.workspaceName);
    }
  };

  // Don't render if not in workspace or on dashboard
  if (!workspaceId || pathname === '/dashboard') {
    return null;
  }

  return (
    <>
      <CreateItemModal />
      <EditSpaceModal />
      <EditFolderModal />
      <EditListModal />

      <div className="flex h-screen overflow-hidden">
        {/* Left Icon Bar - "Extra" Sidebar - Always Visible */}
        <div
          className="w-[64px] flex flex-col items-center py-5 transition-all duration-500 relative z-20 border-r border-white/5 flex-shrink-0"
          style={{
            background: themeMode === 'dark' 
              ? 'rgba(0, 0, 0, 0.2)' 
              : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Subtle glow background based on accent color */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${themeColor}, transparent 80%)`,
            }}
          />

          {/* System Logo - Premium Styling */}
          <div className="mb-8 relative group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-md flex items-center justify-center shadow-2xl relative overflow-hidden"
              style={{
                backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                border: themeMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
              <img 
                src={logoUrl || "/teamsever_logo.png"} 
                alt="System Logo" 
                className="w-8 h-8 object-contain"
              />
              
              {/* Subtle animated overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
            
            {/* Active Workspace Indicator (Small dot) */}
            <div 
              className="absolute -right-1 -top-1 w-3 h-3 rounded-full border-2 border-[#1e1f21] z-10 shadow-lg"
              style={{ backgroundColor: themeColor }}
            />
          </div>

          {/* Primary Navigation */}
          <div className="flex-1 flex flex-col gap-4 w-full px-2 relative">
            {/* DASHBOARD */}
            <div className="relative group">
              <Link
                href={`/workspace/${workspaceId}/analytics`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-md transition-all duration-300 relative z-10',
                  pathname === `/workspace/${workspaceId}/analytics`
                    ? (themeMode === 'dark' ? 'text-white' : 'text-slate-900')
                    : (themeMode === 'dark' ? 'text-white/50 hover:text-white/90' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5')
                )}
                title="Dashboard"
              >
                <div className="relative">
                  <BarChart3 className="w-5 h-5 relative z-10" />
                  {pathname === `/workspace/${workspaceId}/analytics` && (
                    <motion.div
                      layoutId="active-glow"
                      className="absolute inset-0 blur-md opacity-40 z-0"
                      style={{ backgroundColor: themeColor }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wide">
                  Dash
                </span>
              </Link>
              
              {/* Smooth Indicator Pill */}
              {pathname === `/workspace/${workspaceId}/analytics` && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute -left-1 top-2 bottom-2 w-1 rounded-r-full z-20 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                  style={{ backgroundColor: themeColor }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </div>

            {/* SETTINGS */}
            <div className="relative group">
              <Link
                href={`/workspace/${workspaceId}/settings`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-md transition-all duration-300 relative z-10',
                  pathname.startsWith(`/workspace/${workspaceId}/settings`)
                    ? (themeMode === 'dark' ? 'text-white' : 'text-slate-900')
                    : (themeMode === 'dark' ? 'text-white/50 hover:text-white/90' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5')
                )}
                title="Settings"
              >
                <div className="relative">
                  <SettingsIcon className="w-5 h-5 relative z-10" />
                  {pathname.startsWith(`/workspace/${workspaceId}/settings`) && (
                    <motion.div
                      layoutId="active-glow"
                      className="absolute inset-0 blur-md opacity-40 z-0"
                      style={{ backgroundColor: themeColor }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wide">
                  Settings
                </span>
              </Link>

              {/* Smooth Indicator Pill */}
              {pathname.startsWith(`/workspace/${workspaceId}/settings`) && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute -left-1 top-2 bottom-2 w-1 rounded-r-full z-20 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                  style={{ backgroundColor: themeColor }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </div>

            {/* MORE */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-md transition-all duration-300",
                    themeMode === 'dark' ? "text-white/50 hover:text-white/90" : "text-slate-500 hover:text-slate-900"
                  )}
                  title="More"
                >
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[10px] font-semibold tracking-wide">
                    More
                  </span>
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className={cn(
                "w-52 ml-2 backdrop-blur-xl border-white/10",
                themeMode === 'dark' ? "bg-[#1a1a1a]/95 text-white" : "bg-white/95 text-slate-900"
              )}>
                <DropdownMenuItem className={cn(
                  "cursor-pointer py-2.5",
                  themeMode === 'dark' ? "focus:bg-white/10 focus:text-white" : "focus:bg-slate-100 focus:text-slate-900"
                )}>
                  <Palette className="h-4 w-4 mr-3 text-indigo-400" />
                  Customize Theme
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={cn(
                    "cursor-pointer py-2.5",
                    themeMode === 'dark' ? "focus:bg-white/10 focus:text-white" : "focus:bg-slate-100 focus:text-slate-900"
                  )}
                  onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
                >
                  <SettingsIcon className="h-4 w-4 mr-3 text-slate-400" />
                  Workspace Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Sidebar Content - Resizable & Collapsible */}
        <div 
          className={cn(
            "bg-white dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-slate-800 flex flex-col relative group/sidebar overflow-hidden",
            !isResizingState && "transition-all duration-300"
          )}
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
        >
          {/* Resize Handle - Only show when sidebar is open */}
          {isSidebarOpen && (
            <div
              onMouseDown={startResizing}
              onDoubleClick={resetSidebarWidth}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors"
              title="Drag to resize, double-click to reset"
            >
              <div className="absolute right-0 top-0 w-[2px] h-full bg-blue-500 opacity-0 group-hover/sidebar:opacity-50 transition-opacity" />
            </div>
          )}
          {/* Workspace Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={handleWorkspaceClick}
              className="flex items-center gap-2 w-full hover:bg-slate-50 dark:hover:bg-[#262626] rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div 
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm overflow-hidden flex-shrink-0 transition-all duration-300",
                    !hierarchy?.logo && accentColor === 'white' ? "text-slate-800 border border-slate-100" : "text-white"
                  )}
                  style={{ 
                    backgroundColor: !hierarchy?.logo ? themeColor : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {hierarchy?.logo ? (
                    <img src={hierarchy.logo} alt={hierarchy?.workspaceName} className="w-full h-full object-contain p-1" />
                  ) : (
                    hierarchy?.workspaceName?.charAt(0) || 'W'
                  )}
                </div>
                <span className="text-sm font-semibold truncate max-w-[130px] transition-colors">
                  {hierarchy?.workspaceName}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            </button>
          </div>



          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-3">
            {loading ? (
              <div className="space-y-4 py-2">
                {/* Quick Links Skeleton */}
                <div className="space-y-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                      <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1" />
                    </div>
                  ))}
                </div>

                {/* Spaces Skeleton */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="py-8 px-2 text-center">
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">Failed to load</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 text-xs"
                  onClick={loadHierarchy}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {/* Quick Links */}
                <div>
                  <div className="space-y-0.5">
                    <Link
                      href={`/workspace/${workspaceId}/chat`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname === `/workspace/${workspaceId}/chat`
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Group Chat</span>
                      {groupChatUnread > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg transform scale-110">
                          {groupChatUnread > 99 ? '99+' : groupChatUnread}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/inbox`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname === `/workspace/${workspaceId}/inbox`
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>Inbox (DMs)</span>
                      {inboxUnread > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg transform scale-110">
                          {inboxUnread > 99 ? '99+' : inboxUnread}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/docs`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname?.includes('/docs')
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Documents
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/files`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname?.includes('/files')
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Files
                    </Link>
                    <Link
                      href={`/workspace/${workspaceId}/attendance`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        pathname === `/workspace/${workspaceId}/attendance`
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Attendance
                    </Link>
                    <Link
                      href="/notifications"
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors relative',
                        pathname === '/notifications'
                          ? 'bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>

                  </div>
                </div>

                {/* Favorites */}
                {favoriteItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Favorites
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {favoriteItems.map((item) => (
                        <HierarchyItemComponent
                          key={item._id}
                          item={item as any}
                          level={0}
                          workspaceId={workspaceId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Spaces */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Spaces
                    </span>
                    {isClient && can('create_space') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleCreateSpace}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {hierarchy?.spaces && hierarchy.spaces.length > 0 ? (
                    <div className="space-y-0.5">
                      {hierarchy.spaces.map((space) => (
                        <HierarchyItemComponent
                          key={space._id}
                          item={space as any}
                          level={0}
                          workspaceId={workspaceId}
                          parentSpaceId={space._id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 py-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">No spaces yet</p>
                      {isClient && can('create_space') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          onClick={handleCreateSpace}
                        >
                          <Plus className="h-3 w-3" />
                          Create Space
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Upgrade Button - Show for non-paid users OR paid users with higher plans available */}
          {subscription && (isAdmin() || isOwner()) && (
            (!subscription.isPaid || (nextPlan?.hasNextPlan)) && (
              <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800">
                <UpgradeButton 
                  workspaceName={hierarchy?.workspaceName || 'Workspace'}
                  whatsappNumber={whatsappNumber}
                  nextPlanName={nextPlan?.nextPlan?.name}
                />
              </div>
            )
          )}

          <div className="p-2 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => router.push('/account')}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <UserAvatar user={user as any} className="h-7 w-7 flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium truncate text-slate-900 dark:text-white text-[11px]">
                  {user?.name || 'User'}
                </div>
                <div className="text-[10px] truncate text-slate-500 dark:text-slate-400">
                  {user?.email}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Switcher Modal */}
      {showWorkspaceSwitcher && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowWorkspaceSwitcher(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-[#262626]">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Switch Workspace</h3>
            </div>
            <ScrollArea className="max-h-[60vh] p-4">
              <div className="space-y-2">
                {allWorkspaces.map((workspace) => (
                  <button
                    key={workspace._id}
                    onClick={() => switchWorkspace(workspace._id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                      workspace._id === workspaceId
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-[#262626] border-2 border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center font-semibold overflow-hidden",
                        accentColor === 'white' ? "text-slate-900 border border-slate-200" : "text-white"
                      )}
                      style={{ backgroundColor: themeColor }}
                    >
                      {workspace.logo ? (
                        <img src={workspace.logo} alt={workspace.name} className="w-full h-full object-contain" />
                      ) : (
                        workspace.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {workspace.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {workspace.members?.length || 0} members
                      </div>
                    </div>
                    {workspace._id === workspaceId && (
                      <div className="text-blue-500 text-xs font-medium">Current</div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}
