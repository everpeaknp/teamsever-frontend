'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Settings, Shield, UserPlus, Info, User } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  channelId: string;
  onSuccess: () => void;
}

export function EditChannelModal({ isOpen, onClose, workspaceId, channelId, onSuccess }: EditChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch channel data and all members
  useEffect(() => {
    if (isOpen && channelId) {
      const fetchData = async () => {
        setFetchingData(true);
        try {
          // Fetch channel details
          const channelRes = await api.get(`/workspaces/${workspaceId}/chat/channels`);
          const channel = channelRes.data.data.find((c: any) => c._id === channelId);
          
          if (channel) {
            setName(channel.name);
            setDescription(channel.description || '');
            setType(channel.type);
            setIsDefault(channel.isDefault || false);
            setSelectedMembers(channel.members || []);
          }

          // Fetch all workspace members
          const membersRes = await api.get(`/workspaces/${workspaceId}/members`);
          if (membersRes.data.success) {
            setMembers(membersRes.data.data || []);
          }
        } catch (err) {
          console.error('Failed to fetch data for edit:', err);
          toast.error('Failed to load channel data');
        } finally {
          setFetchingData(false);
        }
      };

      fetchData();
    }
  }, [isOpen, channelId, workspaceId]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/chat/channels/${channelId}`, {
        name: name.trim(),
        description: description.trim(),
        type,
        members: type === 'private' ? selectedMembers : [],
      });

      toast.success('Channel updated successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update channel');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  }, []);

  const filteredMembers = useMemo(() => 
    members.filter(m => 
      m?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [members, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Channel Settings
              {isDefault && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">Default</span>}
            </DialogTitle>
          </DialogHeader>

          {fetchingData ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-semibold text-foreground/80">Channel Name</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <span className="text-lg font-bold">#</span>
                    </div>
                    <Input
                      id="edit-name"
                      placeholder="e.g. marketing-team"
                      value={name}
                      onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="pl-8 bg-background/50 border-border focus:ring-2 focus:ring-primary/20 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-semibold text-foreground/80">Description</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="What's this channel about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background/50 border-border focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                  />
                </div>

                {!isDefault && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground/80">Visibility</Label>
                    <Select value={type} onValueChange={(v: 'public' | 'private') => setType(v)}>
                      <SelectTrigger className="bg-background/50 border-border h-11 transition-all">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="public">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium text-foreground">Public</span>
                            <span className="text-xs text-muted-foreground text-left">Anyone in the workspace can join</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium text-foreground">Private</span>
                            <span className="text-xs text-muted-foreground text-left">Only invited members can access</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {type === 'private' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground/80 flex items-center justify-between">
                      Manage Members
                      <span className="text-xs font-normal text-muted-foreground">{selectedMembers.length} members</span>
                    </Label>
                    
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search workspace members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/30 border-border h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {filteredMembers.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">No members found</div>
                      ) : (
                        filteredMembers.map((member) => (
                          <div
                            key={member._id}
                            className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                            onClick={() => toggleMember(member._id)}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <UserAvatar user={member} className="h-8 w-8 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.name || 'Unnamed'}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.email || 'No email'}</p>
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedMembers.includes(member._id)}
                                onCheckedChange={() => toggleMember(member._id)}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-border flex flex-row justify-between items-center bg-muted/30 -mx-6 -mb-6 p-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !name.trim()}
                  className="px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
