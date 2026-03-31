'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Hash, Lock, Search, User } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
  avatar?: string;
}

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: () => void;
}

export const CreateChannelModal = ({ isOpen, onClose, workspaceId, onSuccess }: CreateChannelModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  // Fetch workspace members for private channel selection
  useEffect(() => {
    if (isOpen && type === 'private') {
      const fetchMembers = async () => {
        try {
          setFetchingMembers(true);
          const response = await api.get(`/workspaces/${workspaceId}/members`);
          if (response.data.success) {
            const currentUserId = localStorage.getItem('userId');
            const members = (response.data.data || [])
              .filter((m: any) => m._id !== currentUserId);
            
            setMembers(members);
          }
        } catch (err) {
          console.error('Failed to fetch members:', err);
        } finally {
          setFetchingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [isOpen, type, workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const response = await api.post(`/workspaces/${workspaceId}/chat/channels`, {
        name: name.trim(),
        description: description.trim(),
        type,
        members: type === 'private' ? selectedMembers : [],
      });

      if (response.data.success) {
        toast.success('Channel created successfully');
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      toast.error(err.response?.data?.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setType('public');
    setSelectedMembers([]);
    setSearchQuery('');
    onClose();
  }, [onClose]);

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
      <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'public' ? <Hash className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            Create Chat Channel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              placeholder="e.g. engineering-team"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={type} onValueChange={(v: 'public' | 'private') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-muted-foreground">Anyone in the workspace can join</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Private</div>
                      <div className="text-xs text-muted-foreground">Only invited members can access</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'private' && (
            <div className="space-y-2 flex-1 flex flex-col overflow-hidden min-h-[150px]">
              <Label>Select Members</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1 mt-2 border rounded-md">
                <div className="p-2 space-y-1">
                  {fetchingMembers ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No members found
                    </div>
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
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedMembers.length} member(s) selected
              </p>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
