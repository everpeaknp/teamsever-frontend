'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { Hash, Image as ImageIcon, Users, LogOut, ExternalLink, Loader2, Lock, Globe } from 'lucide-react';
import { useProfileModalStore } from '@/store/useProfileModalStore';

interface ChatDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'workspace' | 'direct';
  title: string;
  workspaceId?: string;
  channelId?: string;
  conversationId?: string;
  userId?: string;
  profileUser?: any;
  onOpenImage?: (images: string[], index: number) => void;
  onChannelLeft?: () => void;
}

export function ChatDetailsDrawer({
  isOpen,
  onClose,
  type,
  title,
  workspaceId,
  channelId,
  conversationId,
  userId,
  profileUser,
  onOpenImage,
  onChannelLeft,
}: ChatDetailsDrawerProps) {
  const { openProfile } = useProfileModalStore();
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load media
    const fetchMedia = async () => {
      setLoadingMedia(true);
      try {
        let endpoint = '';
        if (type === 'direct' && conversationId) {
          endpoint = `/dm/conversations/${conversationId}/media`;
        } else if (type === 'workspace' && workspaceId && channelId) {
          endpoint = `/workspaces/${workspaceId}/chat/channels/${channelId}/media`;
        }

        if (endpoint) {
          const res = await api.get(endpoint);
          if (res.data?.success) {
            const raw = res.data.data || [];
            const urls = raw.map((item: any) => item.url || item).filter(Boolean);
            setMediaList(urls);
          }
        }
      } catch (err) {
        console.error('Failed to load shared media:', err);
      } finally {
        setLoadingMedia(false);
      }
    };

    fetchMedia();

    // If channel, load channel details & members
    if (type === 'workspace' && workspaceId && channelId) {
      const fetchChannelInfoAndMembers = async () => {
        setLoadingMembers(true);
        try {
          const [membersRes, channelRes] = await Promise.all([
            api.get(`/workspaces/${workspaceId}/chat/channels/${channelId}/members`),
            api.get(`/workspaces/${workspaceId}/chat/channels/${channelId}`).catch(() => null),
          ]);
          if (membersRes.data?.success) {
            setChannelMembers(membersRes.data.data || []);
          }
          if (channelRes?.data?.success && channelRes.data.data) {
            setChannelInfo(channelRes.data.data);
          }
        } catch (err) {
          console.error('Failed to load channel members:', err);
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchChannelInfoAndMembers();
    }
  }, [isOpen, type, workspaceId, channelId, conversationId]);

  const handleLeaveChannel = async () => {
    if (!workspaceId || !channelId) return;
    if (!confirm(`Are you sure you want to leave #${title}? You will no longer receive updates from this channel.`)) {
      return;
    }

    setLeaving(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/chat/channels/${channelId}/leave`);
      if (res.data?.success) {
        toast.success(`You left #${title}`);
        onClose();
        onChannelLeft?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave channel');
    } finally {
      setLeaving(false);
    }
  };

  const normalizedTitle = title.replace(/^#/, '').trim().toLowerCase();
  const isProtectedChannel =
    normalizedTitle === 'general' ||
    normalizedTitle === 'commit log' ||
    normalizedTitle === 'commit-log' ||
    channelInfo?.isDefault;

  const profileUserId = profileUser?._id || profileUser?.id || userId;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-left flex items-center gap-2">
            {type === 'direct' ? 'Conversation Info' : 'Channel Details'}
          </SheetTitle>
        </SheetHeader>

        {/* Header Profile / Channel Details */}
        <div className="p-6 border-b flex flex-col items-center text-center bg-muted/20">
          {type === 'direct' ? (
            <>
              <UserAvatar user={profileUser} className="h-20 w-20 mb-3 shadow-sm" />
              <h3 className="font-bold text-lg text-foreground">{title}</h3>
              {profileUser?.email && (
                <p className="text-xs text-muted-foreground mt-0.5">{profileUser.email}</p>
              )}
              {profileUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 text-xs rounded-xl"
                  onClick={() => openProfile(profileUserId)}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View Profile
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center mb-3 text-primary">
                {channelInfo?.type === 'private' ? (
                  <Lock className="h-8 w-8 text-amber-500" />
                ) : (
                  <Hash className="h-8 w-8 text-primary" />
                )}
              </div>
              <h3 className="font-bold text-lg text-foreground">#{title.replace(/^#/, '')}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  channelInfo?.type === 'private'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {channelInfo?.type === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  {channelInfo?.type === 'private' ? 'Private Channel' : 'Public Channel'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {channelInfo?.type === 'private'
                  ? `${channelMembers.length} member${channelMembers.length === 1 ? '' : 's'}`
                  : `All workspace members (${channelMembers.length})`}
              </p>
              {channelInfo?.description && (
                <p className="text-xs text-muted-foreground/80 max-w-xs mt-1 italic">
                  {channelInfo.description}
                </p>
              )}
              {!isProtectedChannel && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leaving}
                  className="mt-3 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl"
                  onClick={handleLeaveChannel}
                >
                  {leaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  Leave Channel
                </Button>
              )}
            </>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {type === 'direct' ? <ExternalLink className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
            {type === 'direct' ? 'Overview' : `Members (${channelMembers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'media'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Shared Photos ({mediaList.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <div>
              {type === 'direct' ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/50 p-4 bg-card space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      User Details
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Full Name: </span>
                      <span className="font-medium text-foreground">{title}</span>
                    </div>
                    {profileUser?.email && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Email: </span>
                        <span className="font-medium text-foreground">{profileUser.email}</span>
                      </div>
                    )}
                    {profileUser?.role && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Workspace Role: </span>
                        <span className="font-medium capitalize text-foreground">{profileUser.role}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {loadingMembers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : channelMembers.length === 0 ? (
                    <p className="text-center py-8 text-xs text-muted-foreground">No members listed</p>
                  ) : (
                    channelMembers.map((member: any) => (
                      <div
                        key={member._id || member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <UserAvatar user={member} className="h-8 w-8" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email || member.role}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => openProfile(member._id || member.id)}
                        >
                          Profile
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'media' && (
            <div>
              {loadingMedia ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mediaList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No photos shared in this conversation yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaList.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => onOpenImage?.(mediaList, idx)}
                      className="aspect-square relative overflow-hidden rounded-lg border border-border/50 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <img src={url} alt={`Shared media ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
