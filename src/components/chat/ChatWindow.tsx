'use client';

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { Send, Loader2, Check, CheckCheck, AlertCircle, RefreshCw, Settings, Github, ArrowLeft, ExternalLink, GitBranch, Calendar as CalendarIcon, User, Folder, CalendarDays, Phone, Video, X, Reply, ImagePlus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { reconcileChatMessages } from '@/lib/chat/reconcileMessages';
import { getMentionKeyAction, getMentionSuggestions, MentionSuggestion } from '@/lib/chat/mentions';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { useProfileModalStore } from '@/store/useProfileModalStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday, isWithinInterval, startOfDay, endOfDay, subDays, startOfWeek } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import type { UserPresence } from '@/hooks/usePresence';
import { ChatConversationIdentity } from './ChatConversationIdentity';
import { getChatMessageContent, MAX_CHAT_IMAGES, shouldRenderChatMessageText, validateChatImageSelection } from '@/lib/chat/chatImages';
import { ChatImageGrid, ChatImageViewer } from './ChatImages';

interface ChatWindowProps {
  workspaceId?: string;
  channelId?: string; // NEW: Support for channels
  conversationId?: string;
  userId?: string; // For DM - the other user's ID
  type: 'workspace' | 'direct';
  title: string;
  profileUser?: { _id?: string; id?: string; name?: string; email?: string; avatar?: string; profilePicture?: string };
  presence?: UserPresence;
  isAdmin?: boolean;
  onMenuClick?: () => void;
}

import { EditChannelModal } from './EditChannelModal';
import { LeaveCard } from './LeaveCard';
import { RequestLeaveModal } from './RequestLeaveModal';
import { MessageReactionsBar, InputEmojiPicker } from './MessageReactionsBar';
import { MessageActionMenu } from './MessageActionMenu';


function ReplyPreview({ reply }: { reply: NonNullable<ChatMessage['replyTo']> }) {
  const item = typeof reply === 'string' ? null : reply;
  if (!item) return null;
  return <div className="mb-1 rounded-md border-l-2 border-primary/70 bg-background/30 px-2 py-1 text-xs"><div className="font-semibold opacity-80">{item.sender?.name || 'Reply'}</div><div className="line-clamp-2 opacity-75">{item.isDeleted ? 'This message was deleted' : item.content}</div></div>;
}

export const ChatWindow = ({ workspaceId, channelId, conversationId, userId, type, title, profileUser, presence, isAdmin, onMenuClick }: ChatWindowProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [presenceNow, setPresenceNow] = useState(() => new Date());
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterFolderId, setFilterFolderId] = useState<string>('all');
  const [filterSpaceName, setFilterSpaceName] = useState<string>('all');
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [memberLookupError, setMemberLookupError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const shouldAutoScrollRef = useRef(true);

  // Get current user from store
  const { user: currentUser, can, currentWorkspaceRole } = useAuthStore();
  const canManageLeaves = can('MANAGE_LEAVES') || can('MANAGE_LEAVES_AND_REMOTE');
  const isWorkspaceOwner = currentWorkspaceRole === 'owner';
  // Fall back to localStorage in case Zustand store hasn't been hydrated yet
  const currentUserId = currentUser?._id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);
  const currentUserName = currentUser?.name || (typeof window !== 'undefined' ? localStorage.getItem('userName') : null);
  const currentUserEmail = currentUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null);
  const isCommitLog = title.includes('Commit Log');
  const mentionSuggestions = mentionQuery === null
    ? []
    : getMentionSuggestions(workspaceMembers, mentionQuery).slice(0, 12);

  useEffect(() => {
    if (type !== 'direct' || presence?.status !== 'offline') return;

    const interval = window.setInterval(() => setPresenceNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, [type, presence?.status, presence?.lastSeen]);

  // Generate room ID - prefer conversationId for DMs to match socket events
  const roomId = type === 'workspace' 
    ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`) 
    : conversationId || (userId && currentUserId ? generateDMRoomId(currentUserId, userId) : '');

  // Zustand store
  const { 
    getRoom, 
    createRoom, 
    addMessage, 
    setMessages,
    updateMessage,
    removeMessage,
    getDraft, 
    setDraft, 
    clearDraft,
    setActiveRoom,
    clearUnread
  } = useChatStore();
  const { openProfile } = useProfileModalStore();
  const { hierarchy } = useWorkspaceStore();
  
  const workspaceFolders = hierarchy?.spaces.flatMap((s) => s.folders) || [];
  // Get or create room
  useEffect(() => {
    if (userId && !currentUserId) return; // Wait for current userId

    if (roomId) {
      const room = getRoom(roomId);
      if (!room) {
        createRoom(roomId, type, workspaceId, userId ? [currentUserId!, userId] : undefined);
      }
      // Set active room - this also clears unread count in useChatStore
      setActiveRoom(roomId);
      toast.dismiss(`chat-notification-${roomId}`);
      if (type === 'direct' && userId) {
        toast.dismiss(`chat-notification-user_${userId}`);
        toast.dismiss(
          `chat-notification-sender_${encodeURIComponent(title.trim().toLowerCase())}`,
        );
      }
      if (type === 'workspace' && workspaceId) {
        clearUnread(`workspace_${workspaceId}`);
      }
    }

    // Cleanup: clear active room when leaving component
    return () => {
      setActiveRoom('');
    };
  }, [roomId, type, workspaceId, userId, currentUserId, getRoom, createRoom, setActiveRoom, clearUnread]);

  useEffect(() => {
    const syncReadState = async () => {
      try {
        if (type === 'workspace' && workspaceId) {
          await api.patch(`/workspaces/${workspaceId}/chat/read`);
        } else if (type === 'direct' && conversationId && workspaceId) {
          await api.patch(`/dm/${conversationId}/read?workspaceId=${workspaceId}`);
        }
      } catch (error) {
      }
    };

    if ((type === 'workspace' && workspaceId) || (type === 'direct' && conversationId)) {
      syncReadState();
    }
  }, [type, workspaceId, conversationId]);

  // Get draft from store
  const draft = getDraft(roomId);
  const [inputValue, setInputValue] = useState(draft);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [imageViewer, setImageViewer] = useState<{ images: string[]; index: number } | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastImageBatchSentAt = useRef(0);

  useEffect(() => {
    const urls = selectedImages.map((file) => URL.createObjectURL(file));
    setPendingImageUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImages]);

  useEffect(() => {
    if (!imageViewer) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setImageViewer(null);
      if (event.key === 'ArrowRight') setImageViewer((current) => current ? { ...current, index: Math.min(current.index + 1, current.images.length - 1) } : current);
      if (event.key === 'ArrowLeft') setImageViewer((current) => current ? { ...current, index: Math.max(current.index - 1, 0) } : current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imageViewer]);

  // Fetch only people who can access this channel before offering @mentions.
  const fetchChannelMembers = useCallback(async () => {
    if (!workspaceId || type !== 'workspace' || !channelId || title.includes('Commit Log')) return;
    setMembersLoading(true);
    setMemberLookupError(null);
    try {
      const response = await api.get(`/chat/channels/${channelId}/members`, { params: { workspaceId } });
      if (!response.data.success) throw new Error('Member lookup failed');
      setWorkspaceMembers(response.data.data || []);
    } catch (error) {
      setMemberLookupError('Could not load channel members. Click to retry.');
    } finally {
      setMembersLoading(false);
    }
  }, [workspaceId, type, channelId, title]);

  useEffect(() => {
    if (workspaceId && type === 'workspace' && channelId && !title.includes('Commit Log')) {
      setWorkspaceMembers([]);
      void fetchChannelMembers();
    } else if (workspaceId && title.includes('Commit Log')) {
      api.get(`/workspaces/${workspaceId}`).then((response) => {
        if (response.data.success) setWorkspaceMembers(response.data.data.members || []);
      }).catch((err) => undefined);
    }
  }, [workspaceId, channelId, type, title, fetchChannelMembers]);

  // Sync draft to store
  useEffect(() => {
    if (roomId && inputValue !== draft) {
      setDraft(roomId, inputValue);
    }
  }, [inputValue, roomId, draft, setDraft]);

  // Load draft when room changes
  useEffect(() => {
    setInputValue(getDraft(roomId));
  }, [roomId, getDraft]);

  // Callback for scrolling to bottom after initial load
  const handleInitialLoad = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  const {
    messages: fetchedMessages,
    loading,
    loadingMore,
    sending,
    error,
    hasMore,
    typingUsers,
    sendMessage,
    deleteMessage,
    updateMessageReactions,
    sendTypingIndicator,
    loadMore,
    refetch: refreshMessages
  } = useChat({ 
    workspaceId, 
    channelId,
    conversationId, 
    userId, 
    type,
    filterUserId: filterUserId === 'all' ? undefined : filterUserId,
    filterFolderId: filterFolderId === 'all' ? undefined : filterFolderId,
    filterSpaceName: filterSpaceName === 'all' ? undefined : filterSpaceName,
    onInitialLoad: handleInitialLoad
  });

  const handleDeleteMessage = useCallback(async (message: ChatMessage) => {
    if ((message.type && message.type !== 'text') || message.isDeleted) return;
    if (!window.confirm('Unsend this message for everyone?')) return;
    try {
      await deleteMessage(message._id);
      toast.success('Message unsent');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not delete message');
    }
  }, [type, deleteMessage]);

  const getCommitRows = useCallback(() => {
    const rows: Array<{
      time: string;
      user: string;
      repository: string;
      branch: string;
      commitSha: string;
      commitAuthor: string;
      commitMessage: string;
      compareUrl: string;
    }> = [];

    localMessages
      .filter((m) => m.type === 'github_commit')
      .forEach((m) => {
        const baseUser =
          (m.sender && typeof m.sender === 'object' && (m.sender as any).name) ||
          m.metadata?.pusher ||
          'GitHub Bot';
        const repo = m.metadata?.repoName || '-';
        const branch = m.metadata?.branchName || 'main';
        const compareUrl = m.metadata?.compareUrl || '';
        const commits = Array.isArray(m.metadata?.commits) ? m.metadata.commits : [];

        if (commits.length === 0) {
          rows.push({
            time: format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            user: baseUser,
            repository: repo,
            branch,
            commitSha: '-',
            commitAuthor: '-',
            commitMessage: m.content || '-',
            compareUrl,
          });
          return;
        }

        commits.forEach((c: any) => {
          const sha =
            typeof c?.url === 'string' && c.url.includes('/')
              ? c.url.split('/').pop()?.substring(0, 7) || '-'
              : '-';
          rows.push({
            time: format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            user: baseUser,
            repository: repo,
            branch,
            commitSha: sha,
            commitAuthor: c?.author || '-',
            commitMessage: c?.message || '-',
            compareUrl,
          });
        });
      });

    return rows;
  }, [localMessages]);

  const selectedContributorName =
    filterUserId === 'all'
      ? null
      : workspaceMembers.find((m) => (m.user?._id || m.user) === filterUserId)?.user?.name || 'Selected User';

  const exportCommitExcel = useCallback(() => {
    const rows = getCommitRows();
    if (rows.length === 0) {
      return;
    }

    const isSingleContributor = !!selectedContributorName;
    const header = isSingleContributor
      ? ['Time', 'Repository', 'Branch', 'Commit SHA', 'Commit Author', 'Commit Message', 'Compare URL']
      : ['Time', 'User', 'Repository', 'Branch', 'Commit SHA', 'Commit Author', 'Commit Message', 'Compare URL'];
    const csvRows = [
      isSingleContributor ? `"Contributor","${selectedContributorName?.replace(/"/g, '""')}"` : '',
      header.join(','),
      ...rows.map((r) =>
        (isSingleContributor
          ? [r.time, r.repository, r.branch, r.commitSha, r.commitAuthor, r.commitMessage, r.compareUrl]
          : [r.time, r.user, r.repository, r.branch, r.commitSha, r.commitAuthor, r.commitMessage, r.compareUrl])
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].filter(Boolean);

    const blob = new Blob([`\ufeff${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = format(new Date(), 'yyyyMMdd_HHmm');
    a.href = url;
    a.download = `commit-log-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [getCommitRows, selectedContributorName]);

  const exportCommitPdf = useCallback(() => {
    const rows = getCommitRows();
    if (rows.length === 0) {
      return;
    }

    const isSingleContributor = !!selectedContributorName;
    const stamp = format(new Date(), 'yyyy-MM-dd HH:mm');
    const htmlRows = rows
      .map(
        (r) => `
          <tr>
            <td>${r.time}</td>
            ${isSingleContributor ? '' : `<td>${r.user}</td>`}
            <td>${r.repository}</td>
            <td>${r.branch}</td>
            <td>${r.commitSha}</td>
            <td>${r.commitAuthor}</td>
            <td>${r.commitMessage}</td>
          </tr>
        `
      )
      .join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Commit Log Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 6px 0; font-size: 24px; }
            p { margin: 0 0 16px 0; color: #555; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f5f5f5; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Commit Log Export</h1>
          ${isSingleContributor ? `<p><strong>Contributor:</strong> ${selectedContributorName}</p>` : ''}
          <p>Generated: ${stamp}</p>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                ${isSingleContributor ? '' : '<th>User</th>'}
                <th>Repository</th>
                <th>Branch</th>
                <th>SHA</th>
                <th>Author</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [getCommitRows, selectedContributorName]);

  // Merge fetched messages with optimistic messages
  useEffect(() => {
    const merged = reconcileChatMessages(fetchedMessages, optimisticMessages);
    
    // Apply filters
    const filtered = merged.filter(m => {
      if (dateFilter === 'all') return true;
      
      const msgDate = new Date(m.createdAt);
      const now = new Date();
      
      if (dateFilter === 'today') return isToday(msgDate);
      if (dateFilter === 'yesterday') return isYesterday(msgDate);
      if (dateFilter === '7days') return isWithinInterval(msgDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
      if (dateFilter === 'week') return isWithinInterval(msgDate, { start: startOfWeek(now), end: endOfDay(now) });
      if (dateFilter === 'custom' && customDate) return isWithinInterval(msgDate, { start: startOfDay(customDate), end: endOfDay(customDate) });
      
      return true;
    });
    
    setLocalMessages(filtered);
  }, [fetchedMessages, optimisticMessages, dateFilter, customDate]);

  // Sync messages to store
  useEffect(() => {
    if (fetchedMessages.length > 0 && roomId) {
      setMessages(roomId, fetchedMessages);
    }
  }, [fetchedMessages, roomId, setMessages]);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [roomId]); // Re-focus when room changes

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && shouldAutoScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If we are already near bottom or just sent a message, keep at bottom
      if (distanceFromBottom < 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [localMessages]);

  // Preserve scroll position when loading more messages
  useEffect(() => {
    if (loadingMore) {
      lastScrollHeightRef.current = messagesContainerRef.current?.scrollHeight || 0;
    } else if (lastScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - lastScrollHeightRef.current;
      if (heightDifference > 0) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollTop + heightDifference;
      }
      lastScrollHeightRef.current = 0;
    }
  }, [loadingMore, messagesContainerRef]);

  // Check if user is scrolling
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // Infinite Scroll: Load more when reaching the TOP (older messages are at the top)
    if (scrollTop < 100 && hasMore && !loadingMore && !loading && localMessages.length > 0) {
      loadMore();
    }
    
    // Near Bottom means we should auto-scroll new messages at the bottom
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 100);
  };

  // Handle send message with optimistic update
  const handleSend = async () => {
    if ((!inputValue.trim() && selectedImages.length === 0) || sending || uploadingImages || !currentUserId || !currentUserName) return;

    const typedMessageContent = inputValue.trim();
    let attachments: string[] = [];
    if (selectedImages.length) {
      if (Date.now() - lastImageBatchSentAt.current < 2000) {
        toast.error('Please wait a moment before sending another image batch.');
        return;
      }
      setUploadingImages(true);
      try {
        const form = new FormData();
        form.append('workspaceId', workspaceId || '');
        if (type === 'direct' && conversationId) form.append('conversationId', conversationId);
        if (type === 'workspace' && channelId) form.append('channelId', channelId);
        selectedImages.forEach((file) => form.append('files', file));
        const response = await api.post('/chat/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        attachments = response.data?.data?.attachments || [];
        if (attachments.length !== selectedImages.length) throw new Error('The uploaded images could not be attached to this message.');
        lastImageBatchSentAt.current = Date.now();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Could not upload images');
        setUploadingImages(false);
        return;
      }
      setUploadingImages(false);
    }
    const messageContent = getChatMessageContent(typedMessageContent, attachments.length);
    const mentions = selectedMentionIds.filter((id) => {
      const member = getMentionSuggestions(workspaceMembers, '').find((candidate) => candidate.id === id);
      return !!member && typedMessageContent.toLocaleLowerCase().includes(`@${member.name}`.toLocaleLowerCase());
    });
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    // Create optimistic message with sending status
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      tempId: tempId,
      sender: {
        _id: currentUserId,
        name: currentUserName,
        email: currentUserEmail || '',
        profilePicture: currentUser?.profilePicture,
        avatar: currentUser?.avatar
      },
      content: messageContent,
      attachments,
      replyTo: replyTarget ? { _id: replyTarget._id, content: replyTarget.content, sender: replyTarget.sender } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'text',
      mentions,
      sending: true,  // Mark as sending
      failed: false,
      ...(type === 'workspace' ? { workspace: workspaceId, channel: channelId } : { conversation: conversationId }),
    };


    // Add optimistic message to optimistic state
    setOptimisticMessages(prev => [...prev, optimisticMessage]);

    // Also add to Zustand store
    addMessage(roomId, optimisticMessage);

    // Clear input immediately for better UX
    setInputValue('');
    setSelectedImages([]);
    clearDraft(roomId);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Scroll to bottom immediately (newest message)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // Send message to backend
    try {
      await sendMessage(messageContent, mentions, replyTarget?._id, attachments);
      setReplyTarget(null);
      setSelectedMentionIds([]);
      setMentionQuery(null);
      
      
      // Update optimistic message status
      setOptimisticMessages(prev => 
        prev.map(m => 
          m._id === tempId 
            ? { ...m, sending: false } 
            : m
        )
      );
      
      // Update in store
      updateMessage(roomId, tempId, { sending: false });
      
    } catch (error) {
      
      // Mark message as failed in optimistic state
      setOptimisticMessages(prev => 
        prev.map(m => 
          m._id === tempId 
            ? { ...m, sending: false, failed: true } 
            : m
        )
      );
      
      // Update in store
      updateMessage(roomId, tempId, { 
        sending: false, 
        failed: true 
      });
    }

    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSelectImages = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    if (imageInputRef.current) imageInputRef.current.value = '';
    const validationError = validateChatImageSelection(selectedImages, picked);
    if (validationError) { toast.error(validationError); return; }
    setSelectedImages((current) => [...current, ...picked]);
  };

  const saveChatImage = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = url.split('/').pop()?.split('?')[0] || 'teamsever-image';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Could not save this image. Please try again.');
    }
  };

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy message');
    }
  }, []);

  // Handle message reaction (Fire, Pulse, Kudos, Love, Like, etc.)
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      if (type === 'workspace') {
        const response = await api.post(`/chat/messages/${messageId}/react`, { emoji });
        updateMessageReactions(messageId, response.data?.data?.reactions);
      } else {
        const response = await api.post(`/dm/messages/${messageId}/react`, { emoji });
        updateMessageReactions(messageId, response.data?.data?.reactions);
      }
    } catch (err: any) {
      toast.error('Failed to react to message');
    }
  }, [type, updateMessageReactions]);

  // Insert emoji at cursor position in textarea
  const handleInsertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInputValue((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = inputValue;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    setInputValue(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  };

  // Quick send a single emoji directly from the picker
  const handleQuickSendEmoji = async (emoji: string) => {
    if (sending || !currentUserId || !currentUserName) return;
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    const optimisticMessage: ChatMessage = {
      _id: tempId,
      tempId: tempId,
      sender: {
        _id: currentUserId,
        name: currentUserName,
        email: currentUserEmail || '',
        profilePicture: currentUser?.profilePicture,
        avatar: currentUser?.avatar,
      },
      content: emoji,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'text',
      sending: true,
      failed: false,
      ...(type === 'workspace' ? { workspace: workspaceId } : { conversation: conversationId }),
    };

    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
    addMessage(roomId, optimisticMessage);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      await sendMessage(emoji);
      setOptimisticMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, sending: false } : m))
      );
      updateMessage(roomId, tempId, { sending: false });
    } catch (error) {
      setOptimisticMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, sending: false, failed: true } : m))
      );
      updateMessage(roomId, tempId, { sending: false, failed: true });
    }
  };

  // Handle keyboard events - Enter to send
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && e.key === 'Escape') {
      setMentionQuery(null);
      return;
    }
    const mentionKeyAction = getMentionKeyAction(e.key, e.shiftKey, mentionSuggestions.length);
    if (mentionKeyAction === 'next' || mentionKeyAction === 'previous') {
      e.preventDefault();
      setActiveMentionIndex((index) => mentionKeyAction === 'next'
        ? (index + 1) % mentionSuggestions.length
        : (index - 1 + mentionSuggestions.length) % mentionSuggestions.length
      );
      return;
    }
    if (mentionKeyAction === 'select') {
      e.preventDefault();
      insertMention(mentionSuggestions[activeMentionIndex] || mentionSuggestions[0]);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);
    const activeMention = value.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(activeMention ? activeMention[1] : null);
    setActiveMentionIndex(0);
    
    if (value.trim()) {
      sendTypingIndicator();
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const insertMention = (member: MentionSuggestion) => {
    const memberId = member.id;
    const name = member.name;
    const atIndex = inputValue.lastIndexOf('@');
    const next = `${inputValue.slice(0, atIndex)}@${name} `;
    setInputValue(next);
    if (memberId && !selectedMentionIds.includes(memberId)) {
      setSelectedMentionIds((previous) => [...previous, memberId]);
    }
    setMentionQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const renderMessageContent = (message: ChatMessage, isOwnMessage = false) => {
    const mentionedIds = new Set((message.mentions || []).map((mention: any) => {
      const user = mention?.user && typeof mention.user === 'object' ? mention.user : mention;
      return typeof mention === 'string' ? mention : user?._id || user?.id || (typeof mention?.user === 'string' ? mention.user : null);
    }));
    const names = getMentionSuggestions(workspaceMembers, '')
      .filter((member) => mentionedIds.has(member.id))
      .map((member) => member.name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!shouldRenderChatMessageText(message.content, message.attachments?.length || 0)) return null;
    if (!names.length) return message.content;
    const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const matcher = new RegExp(`(@(?:${escaped.join('|')}))`, 'gi');
    return message.content.split(matcher).map((part, index) =>
      part.startsWith('@') && names.some((name) => part.toLocaleLowerCase() === `@${name}`.toLocaleLowerCase())
        ? <span key={`${message._id}-mention-${index}`} className={cn('rounded px-1 font-semibold', isOwnMessage ? 'bg-white/15 text-white' : 'bg-primary/15 text-primary')}>{part}</span>
        : part
    );
  };

  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Group messages by sender
  const isSameMessageGroup = (message: ChatMessage, other?: ChatMessage) => {
    if (!other || message.type === 'system' || other.type === 'system') return false;
    if (message.type === 'github_commit' || other.type === 'github_commit') return false;
    if (message.sender._id !== other.sender._id) return false;
    return Math.abs(new Date(message.createdAt).getTime() - new Date(other.createdAt).getTime()) <= 5 * 60 * 1000;
  };

  const shouldShowAvatar = (message: ChatMessage, index: number) => {
    return !isSameMessageGroup(message, localMessages[index - 1]);
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <div className="text-muted-foreground">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="text-destructive text-lg font-semibold mb-2">Failed to load messages</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="h-14 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            className="md:hidden -ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-muted"
            onClick={onMenuClick}
            aria-label={type === 'direct' ? 'Back to conversations' : 'Back to channels'}
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <ChatConversationIdentity
            type={type}
            title={title}
            profileUser={profileUser}
            presence={presence}
            now={presenceNow}
          />
          {type === 'direct' && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => toast.info('Audio calls are not available yet.')}
                className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Start audio call"
                title="Audio call"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => toast.info('Video calls are not available yet.')}
                className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Start video call"
                title="Video call"
              >
                <Video className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
          
          {isCommitLog && (
            <div className="ml-2 flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-border/30 bg-muted/20 p-1 overflow-x-auto no-scrollbar sm:ml-4">
              {(['all', 'today', 'yesterday', '7days', 'week'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={cn(
                    "min-h-11 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]",
                    dateFilter === f 
                      ? "bg-background text-primary shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                >
                  {f === 'all' && 'All'}
                  {f === 'today' && 'Today'}
                  {f === 'yesterday' && 'Yesterday'}
                  {f === '7days' && '7d'}
                  {f === 'week' && 'Week'}
                </button>
              ))}
              
              <Popover>
                <PopoverContent className="w-auto p-0" align="end">
                  <UICalendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => {
                      setCustomDate(date);
                      if (date) setDateFilter('custom');
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-4 bg-border/40 mx-1 hidden sm:block" />

              {/* User Filter Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "min-h-11 px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]",
                      filterUserId !== 'all' 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <User className="h-4 w-4 md:h-3 md:w-3" />
                    {filterUserId === 'all' ? 'Users' : workspaceMembers.find(m => (m.user?._id || m.user) === filterUserId)?.user?.name || 'User'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      onClick={() => setFilterUserId('all')}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors",
                        filterUserId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      All Contributors
                    </button>
                    {workspaceMembers.map((member) => {
                      const mId = member.user?._id || member.user;
                      return (
                        <button
                          key={mId}
                          onClick={() => setFilterUserId(mId)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors flex items-center gap-2",
                            filterUserId === mId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member.user?.profilePicture} />
                            <AvatarFallback className="text-[8px]">{getInitials(member.user?.name || 'U')}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{member.user?.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-4 bg-border/40 mx-1 hidden sm:block" />

              {/* Folder Filter Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "min-h-11 px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]",
                      filterFolderId !== 'all' 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Folder className="h-4 w-4 md:h-3 md:w-3" />
                    {filterFolderId === 'all' ? 'Folders' : workspaceFolders.find(f => f._id === filterFolderId)?.name || 'Folder'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      onClick={() => setFilterFolderId('all')}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors",
                        filterFolderId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      All Folders
                    </button>
                    {workspaceFolders
                      .filter(folder => filterFolderId !== 'all' || folder.githubRepoName || localMessages.some(m => m.type === 'github_commit' && m.metadata?.folderId === folder._id))
                      .map((folder) => (
                      <button
                        key={folder._id}
                        onClick={() => setFilterFolderId(folder._id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors flex items-center gap-2",
                          filterFolderId === folder._id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-4 bg-border/40 mx-1 hidden sm:block" />

              {/* Space Filter Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "min-h-11 px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]",
                      filterSpaceName !== 'all' 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Folder className="h-4 w-4 md:h-3 md:w-3" />
                    {filterSpaceName === 'all' ? 'Spaces' : filterSpaceName}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      onClick={() => setFilterSpaceName('all')}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors",
                        filterSpaceName === 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      All Spaces
                    </button>
                    {(hierarchy?.spaces || [])
                      .filter(space => filterSpaceName !== 'all' || space.githubRepoName || localMessages.some(m => m.type === 'github_commit' && m.metadata?.spaceName === space.name && !m.metadata?.folderId))
                      .map((space) => (
                      <button
                        key={space._id}
                        onClick={() => setFilterSpaceName(space.name)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors flex items-center gap-2",
                          filterSpaceName === space.name ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{space.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {isCommitLog && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={exportCommitExcel}
                disabled={localMessages.filter((m) => m.type === 'github_commit').length === 0}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={exportCommitPdf}
                disabled={localMessages.filter((m) => m.type === 'github_commit').length === 0}
              >
                Export PDF
              </Button>
            </>
          )}
          {type === 'direct' && userId && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all hidden sm:flex"
              onClick={() => openProfile(userId)}
            >
              <User className="w-3.5 h-3.5" />
              View Profile
            </Button>
          )}
          {type === 'workspace' && channelId && !title.includes('General') && !isCommitLog && isAdmin && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
              title="Channel Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {workspaceId && channelId && (
        <EditChannelModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          workspaceId={workspaceId}
          channelId={channelId}
          onSuccess={() => {
            // Ideally refetch channel list - this is handled by state in parent usually
            window.location.reload(); // Simple sync for now or we could use custom events
          }}
        />
      )}

      {/* Messages - Scrollable */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 chat-scrollbar sm:p-6"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148, 163, 184, 0.45) transparent'
        }}
      >
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Load More Indicator at the top (older messages) */}
        {hasMore && !loadingMore && localMessages.length > 0 && (
          <div className="flex justify-center p-4">
            <span className="text-xs text-muted-foreground italic">Scroll up for older messages</span>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {localMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[300px]">
            <div className="text-center p-8 bg-muted/10 rounded-2xl border border-dashed border-border/50 max-w-sm mx-auto">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          localMessages.map((message, index) => {
            const showAvatar = shouldShowAvatar(message, index);
            const groupedWithPrevious = isSameMessageGroup(message, localMessages[index - 1]);
            const groupedWithNext = isSameMessageGroup(message, localMessages[index + 1]);
            const isSystemMessage = message.type === 'system';
            const isOwnMessage = message.sender._id === currentUserId;
            const hasVisibleText = shouldRenderChatMessageText(message.content, message.attachments?.length || 0);
            const readers = (message.readBy || [])
              .map(reader => typeof reader === 'string' ? null : reader)
              .filter((reader): reader is NonNullable<typeof reader> => Boolean(reader && reader._id !== currentUserId));
            const canUnsend = isOwnMessage && !isCommitLog && (!message.type || message.type === 'text') && !message.isDeleted && !message.tempId;
            const withMessageActions = (content: React.ReactNode) => (
              <MessageActionMenu
                key={message._id}
                onReact={(emoji) => void handleReact(message._id, emoji)}
                onReply={() => { setReplyTarget(message); textareaRef.current?.focus(); }}
                onCopy={() => void handleCopyMessage(message)}
                onDelete={canUnsend ? () => void handleDeleteMessage(message) : undefined}
              >{content}</MessageActionMenu>
            );

            if (message.isDeleted) {
              const deletedAttribution = isOwnMessage ? (
                <div className="mb-1.5 flex items-center justify-end gap-2 opacity-90">
                  <span className="text-[10px] font-medium text-muted-foreground">{formatMessageTime(message.createdAt)}</span>
                  <span className="text-xs font-bold text-primary">You</span>
                </div>
              ) : (
                <div className="mb-1.5 flex items-center gap-2 opacity-90">
                  <UserAvatar
                    user={message.sender}
                    className="h-8 w-8 shrink-0 cursor-pointer hover:opacity-80"
                    onClick={() => openProfile(message.sender._id)}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-pointer text-xs font-bold text-foreground hover:text-primary"
                      onClick={() => openProfile(message.sender._id)}
                    >{message.sender.name}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{formatMessageTime(message.createdAt)}</span>
                  </div>
                </div>
              );
              return (
                <div key={message._id} className={cn('flex w-full', isOwnMessage ? 'justify-end' : 'justify-start')}>
                  <div className="flex max-w-[82%] flex-col">
                    {deletedAttribution}
                    <p className={cn('rounded-2xl bg-muted/50 px-4 py-2 text-sm italic text-muted-foreground', !isOwnMessage && 'ml-10')}>
                      This message was deleted
                    </p>
                  </div>
                </div>
              );
            }

            if (isSystemMessage) {
              return (
                <div key={message._id} className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                </div>
              );
            }

            if (message.type === 'github_commit') {
              return (
                <div key={message._id} className="group relative pl-8 pr-4 py-4 border-l-2 border-border/30 hover:border-primary/30 transition-colors ml-6">
                  {/* Timeline Dot with Avatar/Icon */}
                  <div className="absolute -left-3 top-5 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center group-hover:border-primary/50 transition-colors overflow-hidden">
                    {message.sender && typeof message.sender === 'object' && (message.sender as any).profilePicture ? (
                      <img 
                        src={(message.sender as any).profilePicture} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Github className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {message.sender && typeof message.sender === 'object' && (message.sender as any).name 
                          ? (message.sender as any).name 
                          : (message.metadata?.pusher || (message.metadata?.commits && message.metadata.commits[0]?.author) || 'GitHub Bot')}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <GitBranch className="h-3 w-3" />
                        <span>{message.metadata?.repoName}</span>
                        <span className="text-border">/</span>
                        <span className="text-primary/70">{message.metadata?.branchName || 'main'}</span>
                        {(message.metadata?.folderId || message.metadata?.folderName || message.metadata?.spaceName) && (
                          <>
                            <span className="mx-1 text-muted-foreground/30">•</span>
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] text-muted-foreground font-bold tracking-tight">
                              {message.metadata.folderName || workspaceFolders.find(f => f._id === message.metadata?.folderId)?.name || message.metadata.spaceName}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 ml-auto">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                        {renderMessageContent(message)}
                      </p>

                      {message.metadata?.commits && message.metadata.commits.length > 0 && (
                        <div className="space-y-3 pl-4 border-l border-border/50">
                          {message.metadata.commits.map((commit: any, i: number) => (
                            <div key={i} className="space-y-1 group/commit">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-foreground/70">
                                  {commit.author}
                                </span>
                                {commit.url && commit.url !== '#' && (
                                  <a 
                                    href={commit.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-muted-foreground hover:text-primary transition-colors font-mono"
                                  >
                                    {commit.url.split('/').pop()?.substring(0, 7)}
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">
                                {commit.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {message.metadata?.compareUrl && (
                        <a 
                          href={message.metadata.compareUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"
                        >
                          View comparison <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Leave Request Card Message (renders interactive card)
            if (message.type === 'leave_request' || (message.metadata && message.metadata.leaveRequestId)) {
              return (
                <div key={message._id} className="my-2 w-full space-y-1.5">
                  <div className={cn('flex gap-3', isOwnMessage ? 'justify-end' : 'justify-start')}>
                    <LeaveCard
                      message={message as any}
                      currentUserId={currentUserId || ''}
                      canManageLeaves={canManageLeaves}
                      isWorkspaceOwner={isWorkspaceOwner}
                      isDirectConversation={type === 'direct'}
                      workspaceId={workspaceId || ''}
                      onStatusUpdated={() => void refreshMessages(1, false)}
                    />
                  </div>
                  {message.metadata?.status && message.metadata.status !== 'pending' && (() => {
                    const resolver = message.metadata.status === 'approved' ? message.metadata.approvedBy : message.metadata.deniedBy;
                    const resolverName = typeof resolver === 'string' ? resolver : resolver?.name || (message.metadata.status === 'approved' ? message.metadata.approvedByName : message.metadata.deniedByName);
                    if (!resolverName) return null;
                    const resolverId = typeof resolver === 'object' ? resolver?._id || resolver?.id : null;
                    const resolvedByCurrentUser = resolverId === currentUserId;
                    const decision = message.metadata.status === 'approved' ? `Approved by ${resolverName}` : `Denied by ${resolverName}`;
                    const detail = message.metadata.status === 'denied' ? message.metadata.denialReason : null;
                    return (
                      <div className={cn('flex', resolvedByCurrentUser ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[min(72vw,22rem)] rounded-xl px-3 py-2 text-xs', resolvedByCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                          <div className="font-semibold">{decision}</div>
                          {detail && <div className="mt-0.5 opacity-85">{detail}</div>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            }

            // Own messages on the right, others on the left
            if (isOwnMessage) {
              return withMessageActions(
                <div
                  className={cn(
                    'flex w-full justify-end group/msg relative',
                    showAvatar && index > 0 && '!mt-4'
                  )}
                >
                  <div className="flex max-w-[82%] flex-col items-end">
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1.5 opacity-90">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        <span className="font-bold text-xs text-primary">
                          You
                        </span>
                      </div>
                    )}
                    <div className="group/bubble relative">
                    {message.replyTo && <ReplyPreview reply={message.replyTo} />}
                    <div className={cn(
                      'w-fit max-w-full whitespace-pre-wrap break-words',
                      hasVisibleText && 'min-w-[40px] rounded-[18px] px-4 py-2 text-sm',
                      hasVisibleText && groupedWithPrevious && 'rounded-tr-md',
                      hasVisibleText && groupedWithNext && 'rounded-br-md',
                      hasVisibleText && message.failed
                        ? "bg-destructive/20 text-destructive border border-destructive" 
                        : hasVisibleText ? "bg-primary text-primary-foreground" : 'bg-transparent p-0'
                    )}>
                      {renderMessageContent(message, true)}
                      <ChatImageGrid className={hasVisibleText ? 'mt-1' : undefined} images={message.attachments || []} onOpen={(index) => setImageViewer({ images: message.attachments || [], index })} />
                      
                      {/* Status indicators */}
                      <div className="flex items-center gap-1 mt-1 justify-end text-xs opacity-70">
                        {message.sending && (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                        )}
                        {message.failed && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Failed</span>
                            <button
                              onClick={() => {
                                setInputValue(message.content);
                                // Remove from optimistic state
                                setOptimisticMessages(prev => prev.filter(m => m._id !== message._id));
                                // Remove from store
                                removeMessage(roomId, message._id);
                              }}
                              className="underline hover:no-underline ml-1"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {!message.sending && !message.failed && !message.tempId && (
                          type === 'direct' && readers.length > 0
                            ? <span className="text-[10px]">Seen</span>
                            : <CheckCheck className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                    </div>

                    {/* Reactions Bar */}
                    {type === 'workspace' && readers.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={`View all ${readers.length} people who saw this message`}
                            className="mt-1 inline-flex max-w-full min-w-0 items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Eye className="h-3 w-3 shrink-0" />
                            <span className="min-w-0 truncate">
                              Seen by {readers.length > 3 ? `${readers.slice(0, 3).map(reader => reader.name || 'Member').join(', ')} +${readers.length - 3}` : readers.map(reader => reader.name || 'Member').join(', ')}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-0">
                          <div className="border-b px-3 py-2 text-sm font-semibold">
                            Seen by {readers.length}
                          </div>
                          <div className="max-h-64 overflow-y-auto p-1">
                            {readers.map(reader => {
                              const name = reader.name || 'Member';
                              return (
                                <div key={reader._id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={reader.profilePicture || reader.avatar} />
                                    <AvatarFallback className="text-[10px]">
                                      {name.trim().charAt(0).toUpperCase() || 'M'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {!message.sending && !message.failed && (message.reactions?.length ?? 0) > 0 && (
                      <MessageReactionsBar reactions={message.reactions as any} currentUserId={currentUserId || ''} className="mt-1 justify-end" />
                    )}
                  </div>

                </div>
              );
            }

            // Other users' messages on the left
            return withMessageActions(
              <div
                className={cn(
                  'flex w-full items-end gap-2 group/msg relative',
                  showAvatar && index > 0 && '!mt-4'
                )}
              >
                {showAvatar && (
                  <UserAvatar 
                    user={message.sender} 
                    className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity mb-1"
                    onClick={() => openProfile(message.sender._id)}
                  />
                )}
                {!showAvatar && <div className="h-8 w-8 flex-shrink-0" aria-hidden="true" />}

                <div className="flex max-w-[82%] flex-col">
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-90">
                      <span 
                        className="font-bold text-xs text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => openProfile(message.sender._id)}
                      >
                        {message.sender.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="group/bubble relative">
                  {message.replyTo && <ReplyPreview reply={message.replyTo} />}
                  <div className={cn(
                    'w-fit max-w-full whitespace-pre-wrap break-words',
                    hasVisibleText && 'min-w-[40px] rounded-[18px] bg-muted px-4 py-2 text-sm text-foreground',
                    !hasVisibleText && 'bg-transparent p-0',
                    hasVisibleText && groupedWithPrevious && 'rounded-tl-md',
                    hasVisibleText && groupedWithNext && 'rounded-bl-md'
                  )}>
                    {renderMessageContent(message)}
                    <ChatImageGrid className={hasVisibleText ? 'mt-1' : undefined} images={message.attachments || []} onOpen={(index) => setImageViewer({ images: message.attachments || [], index })} />
                  </div>
                  </div>

                  {/* Reactions Bar */}
                  {(message.reactions?.length ?? 0) > 0 && <MessageReactionsBar reactions={message.reactions as any} currentUserId={currentUserId || ''} className="mt-1 justify-start" />}
                </div>

              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 text-xs text-muted-foreground flex-shrink-0">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input Area - Hidden for Commit Log */}
      {!isCommitLog && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm transition-all sm:p-4 md:pb-6">
          {replyTarget && <div className="mx-auto mb-2 flex max-w-4xl items-center gap-2 rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2 text-sm"><Reply className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="font-medium">Replying to {replyTarget.sender.name}</div><div className="truncate text-xs text-muted-foreground">{replyTarget.content}</div></div><button type="button" aria-label="Cancel reply" onClick={() => setReplyTarget(null)}><X className="h-4 w-4" /></button></div>}
          {selectedImages.length > 0 && <div className="mx-auto mb-2 flex max-w-4xl items-center gap-2 overflow-x-auto">
            {pendingImageUrls.map((url, index) => <div key={`${url}-${index}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
              <img src={url} alt={`Image to send ${index + 1}`} className="h-full w-full object-contain" />
              <button type="button" aria-label={`Remove image ${index + 1}`} disabled={uploadingImages} onClick={() => setSelectedImages((images) => images.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"><X className="h-3.5 w-3.5" /></button>
            </div>)}
            <span className="text-xs text-muted-foreground">{uploadingImages ? 'Uploading images…' : `${selectedImages.length} image${selectedImages.length === 1 ? '' : 's'}`}</span>
          </div>}
          <div className="mx-auto flex min-w-0 max-w-4xl items-end gap-2">
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(event) => handleSelectImages(event.target.files)} />
            <Button type="button" variant="ghost" size="icon" aria-label="Attach images" title="Attach images" disabled={sending || uploadingImages || selectedImages.length >= MAX_CHAT_IMAGES} onClick={() => imageInputRef.current?.click()} className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-primary">
              <ImagePlus className="h-5 w-5" />
            </Button>
            <div className="relative min-w-0 flex-1">
              {mentionQuery !== null && type === 'workspace' && !isCommitLog && (
                <div role="listbox" aria-label="Mention a channel member" className="absolute bottom-full left-0 z-30 mb-2 max-h-56 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
                  {mentionSuggestions
                    .map((member, index) => (
                      <button key={member.id} type="button" role="option" aria-selected={activeMentionIndex === index} onMouseEnter={() => setActiveMentionIndex(index)} onClick={() => insertMention(member)} className={cn('flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm', activeMentionIndex === index ? 'bg-accent' : 'hover:bg-accent')}>
                        <span className="w-full truncate font-medium">{member.name}</span>
                        {member.email && <span className="w-full truncate text-xs text-muted-foreground">{member.email}</span>}
                      </button>
                    ))}
                  {mentionSuggestions.length === 0 && (
                    memberLookupError
                      ? <button type="button" onClick={() => void fetchChannelMembers()} className="w-full px-3 py-2 text-left text-sm text-destructive">{memberLookupError}</button>
                      : <p className="px-3 py-2 text-sm text-muted-foreground">{membersLoading ? 'Loading members…' : 'No channel members found'}</p>
                  )}
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-32 resize-none pr-10 rounded-xl bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                rows={1}
                autoFocus
              />
              <InputEmojiPicker
                onSelectEmoji={handleInsertEmoji}
                onQuickSend={handleQuickSendEmoji}
                className="absolute right-3 bottom-2"
              />
            </div>

            {/* In DMs: create a leave or temporary remote request */}
            {type === 'direct' && userId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLeaveModalOpen(true)}
                className="h-[44px] px-3 flex-shrink-0 rounded-xl gap-1.5 border-dashed border-border/80 hover:border-primary/50 text-xs font-semibold text-muted-foreground hover:text-primary transition-all"
                title="Request leave or remote work in this DM"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Request</span>
              </Button>
            )}

            <Button
              onClick={handleSend}
              disabled={(!inputValue.trim() && selectedImages.length === 0) || sending || uploadingImages}
              size="icon"
              className="h-[44px] w-[44px] flex-shrink-0 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground mt-2 px-1">
            <span className="hidden sm:inline">Shift + Enter for new line • Enter to send</span>
            <span className="sm:hidden">Press send to transmit</span>
          </div>
        </div>
      )}

      {imageViewer && <ChatImageViewer
        images={imageViewer.images}
        index={imageViewer.index}
        onClose={() => setImageViewer(null)}
        onIndexChange={(index) => setImageViewer((current) => current ? { ...current, index } : current)}
        onDownload={(url) => void saveChatImage(url)}
      />}

      {/* Request Leave Modal in DMs */}
      {type === 'direct' && userId && workspaceId && (
        <RequestLeaveModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          workspaceId={workspaceId}
          assignedManagerId={userId}
          conversationId={conversationId}
          managerName={title.replace(/^#\s*/, '')}
          onRequestSubmitted={() => {
            // New message will appear automatically via socket dm:new
          }}
        />
      )}
    </div>
  );
};

