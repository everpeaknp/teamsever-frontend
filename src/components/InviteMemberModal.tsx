import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceColor: string;
  availableMembers: any[];
  selectedMembers: string[];
  onToggleMemberSelection: (memberId: string) => void;
  onAddMembers: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  getInitials: (name: string) => string;
}

export function InviteMemberModal({
  open,
  onOpenChange,
  spaceColor,
  availableMembers,
  selectedMembers,
  onToggleMemberSelection,
  onAddMembers,
  searchQuery,
  onSearchChange,
  getInitials,
}: InviteMemberModalProps) {
  const filteredMembers = availableMembers.filter((m: any) => {
    const user = typeof m.user === 'object' ? m.user : null;
    if (!user) return false;
    const searchLower = searchQuery.toLowerCase();
    return user.name.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Workspace Members to Space</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Search workspace members..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {availableMembers.length === 0 ? (
                  <>
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>All workspace members are already in this space</p>
                  </>
                ) : (
                  <p>No members found matching "{searchQuery}"</p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map((member: any) => {
                  const user = typeof member.user === 'object' ? member.user : null;
                  if (!user) return null;
                  const isSelected = selectedMembers.includes(user._id);

                  return (
                    <div
                      key={user._id}
                      className={`p-4 hover:bg-accent transition-colors cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                      onClick={(e) => {
                        // Prevent double-triggering when clicking checkbox directly
                        if ((e.target as HTMLElement).closest('button[role="checkbox"]')) {
                          return;
                        }
                        onToggleMemberSelection(user._id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleMemberSelection(user._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback style={{ backgroundColor: spaceColor, color: 'white' }}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">{member.role}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedMembers.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <span className="text-sm font-medium">{selectedMembers.length} member(s) selected</span>
              <Button variant="ghost" size="sm" onClick={() => selectedMembers.forEach(onToggleMemberSelection)}>
                Clear
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onAddMembers}
              disabled={selectedMembers.length === 0}
              className="flex-1"
              style={{ backgroundColor: selectedMembers.length > 0 ? spaceColor : undefined }}
            >
              Add {selectedMembers.length > 0 && `(${selectedMembers.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
