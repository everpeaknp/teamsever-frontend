'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow, ChatSidebar } from '@/components/chat';
import { cn } from '@/lib/utils';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import { useChatStore } from '@/store/useChatStore';
import { Loader2, Hash, Lock, Crown, Sparkles, User, Send } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ChatSkeleton } from '@/components/skeletons/PageSkeleton';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [hasGroupChat, setHasGroupChat] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Chat selection state
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [chatType, setChatType] = useState<'workspace' | 'direct'>('workspace');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [dmUserId, setDmUserId] = useState<string | undefined>();
  const [chatTitle, setChatTitle] = useState('General');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [channelSidebarWidth, setChannelSidebarWidth] = useState(320);
  const [isResizingChannels, setIsResizingChannels] = useState(false);
  const isResizingRef = useRef(false);
  const channelSidebarRef = useRef<HTMLDivElement>(null);

  const MIN_CHANNEL_SIDEBAR_WIDTH = 260;
  const MAX_CHANNEL_SIDEBAR_WIDTH = 520;
  const DEFAULT_CHANNEL_SIDEBAR_WIDTH = 320;

  const { setActiveRoom } = useChatStore();

  // Initialize auth and socket
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId || token === 'undefined' || token === 'null' || token.trim() === '') {
      router.push('/login');
      return;
    }

    try {
      initializeSocket(token);
      joinWorkspace(workspaceId);
      setIsLoading(false);
    } catch (error) {
      console.error('[GroupChat] Socket initialization failed:', error);
      setIsLoading(false);
    }
  }, [router, workspaceId]);

  // Fetch workspace details and check access
  useEffect(() => {
    if (!workspaceId) return;

    const fetchWorkspace = async () => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}`);
        const userId = localStorage.getItem('userId');

        if (response.data.success) {
          const workspace = response.data.data;
          setWorkspaceName(workspace.name);
          
          const userMembership = workspace.members.find((m: any) => 
            (m.user._id || m.user) === userId
          );
          
          setIsOwner(workspace.owner === userId || workspace.owner._id === userId);
          setIsAdmin(userMembership?.role === 'admin' || workspace.owner === userId || workspace.owner._id === userId);
          setHasGroupChat(workspace.subscription?.plan?.features?.hasGroupChat || false);
          setCheckingAccess(false);
        }
      } catch (err) {
        console.error('Failed to fetch workspace:', err);
        setCheckingAccess(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  const handleChannelSelect = useCallback((
    channelId: string, 
    type: 'workspace' | 'direct', 
    name: string,
    convId?: string, 
    uId?: string
  ) => {
    setActiveChannelId(channelId);
    setChatType(type);
    setConversationId(convId);
    setDmUserId(uId);
    setChatTitle(name);
  }, []);

  useEffect(() => {
    if (!workspaceId || typeof window === 'undefined') return;
    const saved = localStorage.getItem(`chat_sidebar_width_${workspaceId}`);
    if (!saved) return;
    const parsed = Number(saved);
    if (!Number.isNaN(parsed)) {
      setChannelSidebarWidth(
        Math.max(MIN_CHANNEL_SIDEBAR_WIDTH, Math.min(MAX_CHANNEL_SIDEBAR_WIDTH, parsed))
      );
    }
  }, [workspaceId]);

  const startChannelResizing = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizingChannels(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopChannelResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    setIsResizingChannels(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (workspaceId && typeof window !== 'undefined') {
      localStorage.setItem(`chat_sidebar_width_${workspaceId}`, String(channelSidebarWidth));
    }
  }, [workspaceId, channelSidebarWidth]);

  const resizeChannelSidebar = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const containerLeft = channelSidebarRef.current?.getBoundingClientRect().left ?? 0;
    const nextWidth = Math.max(
      MIN_CHANNEL_SIDEBAR_WIDTH,
      Math.min(MAX_CHANNEL_SIDEBAR_WIDTH, e.clientX - containerLeft)
    );
    setChannelSidebarWidth(nextWidth);
  }, []);

  const resetChannelSidebarWidth = useCallback(() => {
    setChannelSidebarWidth(DEFAULT_CHANNEL_SIDEBAR_WIDTH);
    if (workspaceId && typeof window !== 'undefined') {
      localStorage.setItem(`chat_sidebar_width_${workspaceId}`, String(DEFAULT_CHANNEL_SIDEBAR_WIDTH));
    }
  }, [workspaceId]);

  useEffect(() => {
    window.addEventListener('mousemove', resizeChannelSidebar);
    window.addEventListener('mouseup', stopChannelResizing);
    return () => {
      window.removeEventListener('mousemove', resizeChannelSidebar);
      window.removeEventListener('mouseup', stopChannelResizing);
    };
  }, [resizeChannelSidebar, stopChannelResizing]);

  if (isLoading || checkingAccess) {
    return <ChatSkeleton />;
  }

  // Lock screen logic remains the same...
  if (!hasGroupChat) {
    return (
      <div className="relative flex h-full bg-background overflow-hidden font-sans">
        {/* Blurred Background */}
        <div className="absolute inset-0 blur-[2px] opacity-60 pointer-events-none">
          <div className="flex h-full">
            <div className="hidden md:flex w-64 border-r border-border flex-col bg-card" />
            <div className="flex-1 flex flex-col bg-background" />
          </div>
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
          <div className="max-w-md w-full mx-4">
            <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Group Chat Locked</h2>
              <p className="text-muted-foreground mb-6">
                {isOwner 
                  ? "Upgrade to Pro to enable multi-channel Group Chat for your team." 
                  : "Ask the workspace owner to activate this feature by upgrading to a Pro plan."}
              </p>
              <button
                onClick={() => router.push('/plans')}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                {isOwner ? "Upgrade to Pro" : "View Plans"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="flex h-full bg-background overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 md:w-[var(--channel-sidebar-width)] md:relative md:translate-x-0 md:z-20 md:shrink-0 transform transition-transform duration-300 ease-in-out",
        !isResizingChannels && "md:transition-[width]",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
      style={{ ['--channel-sidebar-width' as any]: `${channelSidebarWidth}px` }}
      ref={channelSidebarRef}
      >
        <div
          className={cn(
            "hidden md:block absolute top-0 -right-1 h-full w-2 cursor-col-resize z-30"
          )}
          onMouseDown={startChannelResizing}
          onDoubleClick={resetChannelSidebarWidth}
        >
        </div>
        <ChatSidebar
          workspaceId={workspaceId}
          activeChannel={activeChannelId}
          onChannelSelect={(...args) => {
            handleChannelSelect(...args);
            setMobileSidebarOpen(false); // Close sidebar on select on mobile
          }}
          isAdmin={isAdmin}
        />
      </div>

      <div className="flex-1 min-w-0 h-full relative z-0">
        <ChatWindow
          workspaceId={workspaceId}
          channelId={chatType === 'workspace' ? activeChannelId : undefined}
          conversationId={conversationId}
          userId={dmUserId}
          type={chatType}
          title={chatType === 'workspace' ? `# ${chatTitle}` : chatTitle}
          isAdmin={isAdmin}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
      </div>
    </div>
  );
}
