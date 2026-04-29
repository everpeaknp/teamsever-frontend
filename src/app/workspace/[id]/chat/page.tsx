'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow, ChatSidebar } from '@/components/chat';
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

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
    setShowMobileSidebar(false);
  }, []);

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
    <div className="flex h-full bg-background font-sans">
      <ChatSidebar
        workspaceId={workspaceId}
        activeChannel={activeChannelId}
        onChannelSelect={handleChannelSelect}
        isAdmin={isAdmin}
        className={showMobileSidebar ? 'flex' : 'hidden md:flex'}
      />

      <div className={`${showMobileSidebar ? 'hidden md:block' : 'block'} flex-1 min-w-0`}>
        <ChatWindow
          workspaceId={workspaceId}
          channelId={chatType === 'workspace' ? activeChannelId : undefined}
          conversationId={conversationId}
          userId={dmUserId}
          type={chatType}
          title={chatType === 'workspace' ? `# ${chatTitle}` : chatTitle}
          isAdmin={isAdmin}
          showMobileBackButton={!showMobileSidebar}
          onMobileBack={() => setShowMobileSidebar(true)}
        />
      </div>
    </div>
  );
}
