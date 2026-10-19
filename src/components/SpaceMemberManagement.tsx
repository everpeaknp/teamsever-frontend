'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { X, Shield, Edit, MessageSquare, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/store/useAuthStore';

export type SpacePermissionLevel = 'FULL' | 'EDIT' | 'COMMENT' | 'VIEW';

interface SpaceMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  workspaceRole: string;
  spaceRole?: string;
  spacePermissionLevel: SpacePermissionLevel | null;
  hasOverride: boolean;
  addedBy: string | null;
  addedAt: string | null;
}

interface SpaceMemberManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  spaceColor?: string;
}

const PERMISSION_ICONS = {
  FULL: Shield,
  EDIT: Edit,
  COMMENT: MessageSquare,
  VIEW: Eye,
};

const PERMISSION_DESCRIPTIONS = {
  FULL: 'Full access - can create, edit, and delete',
  EDIT: 'Can create and edit tasks',
  COMMENT: 'Can only comment on tasks',
  VIEW: 'Read-only access',
};

export function SpaceMemberManagement({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  spaceColor = '#3b82f6',
}: SpaceMemberManagementProps) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const { isAdmin, isOwner } = usePermissions();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, spaceId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/spaces/${spaceId}/space-members`);
      setMembers(response.data.data);
    } catch (error: any) {
      toast.error('Failed to load space members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (
    userId: string,
    permissionLevel: SpacePermissionLevel
  ) => {
    setUpdating(userId);
    try {
      await api.post(`/spaces/${spaceId}/space-members`, {
        userId,
        permissionLevel,
      });
      toast.success('Permission updated successfully');
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permission');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveOverride = async (userId: string) => {
    setUpdating(userId);
    try {
      await api.delete(`/spaces/${spaceId}/space-members/${userId}`);
      toast.success('Permission override removed');
      fetchMembers();
    } catch (error: any) {
      toast.error('Failed to remove permission override');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    setUpdating(userId);
    try {
      await api.delete(`/spaces/${spaceId}/members/${userId}`);
      toast.success(`${memberName} removed from space`);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    } finally {
      setUpdating(null);
    }
  };

  const renderPermissionSelect = (member: SpaceMember, triggerClassName: string) => {
    const PermissionIcon = member.spacePermissionLevel
      ? PERMISSION_ICONS[member.spacePermissionLevel]
      : null;

    return (
      <Select
        value={member.spacePermissionLevel || 'default'}
        onValueChange={(value) => {
          if (value === 'default') {
            handleRemoveOverride(member._id);
          } else {
            handleUpdatePermission(member._id, value as SpacePermissionLevel);
          }
        }}
        disabled={updating === member._id}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue>
            {member.spacePermissionLevel ? (
              <div className="flex min-w-0 items-center gap-2">
                {PermissionIcon && <PermissionIcon className="h-4 w-4 shrink-0" />}
                <span className="truncate text-sm">{member.spacePermissionLevel}</span>
              </div>
            ) : (
              <span className="truncate text-muted-foreground">Use workspace role</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            <div className="flex flex-col items-start">
              <span>Use Workspace Role</span>
              <span className="text-xs text-muted-foreground">No override</span>
            </div>
          </SelectItem>
          {Object.entries(PERMISSION_DESCRIPTIONS).map(([level, description]) => {
            const Icon = PERMISSION_ICONS[level as SpacePermissionLevel];
            return (
              <SelectItem key={level} value={level}>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">{level}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  };

  const renderMemberActions = (member: SpaceMember) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {member.hasOverride && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveOverride(member._id)}
          disabled={updating === member._id}
          className="min-h-10 px-3 text-xs"
        >
          Reset
        </Button>
      )}
      {(isOwner() || isAdmin()) && member.workspaceRole !== 'owner' && member._id !== currentUserId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRemoveMember(member._id, member.name)}
          disabled={updating === member._id}
          className="min-h-10 border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
        >
          Remove
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[calc(100vw-1rem)] max-h-[88dvh] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-background p-0 sm:max-h-[80vh] sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Space Permissions
          </DialogTitle>
          <DialogDescription className="text-sm">
            Members inside {spaceName}. Invite from the separate invite modal.
          </DialogDescription>
        </DialogHeader>

        <div role="region" aria-label="Space members and permissions" tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-9 w-32" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No members have access to this space yet.
            </div>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {members.map((member) => (
                <article key={member._id} data-member-card className="min-w-0 rounded-xl border border-border bg-card p-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar user={member} className="h-11 w-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">{member.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{member.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="w-fit capitalize">{member.workspaceRole}</Badge>
                        {(member as any).customRole ? (
                          <Badge
                            variant="outline"
                            className="h-5 w-fit px-1.5 py-0 text-[10px]"
                            style={{
                              backgroundColor: `${(member as any).customRole.color}20`,
                              color: (member as any).customRole.color,
                              borderColor: `${(member as any).customRole.color}40`,
                            }}
                          >
                            {(member as any).customRole.label}
                          </Badge>
                        ) : (member as any).customRoleTitle ? (
                          <Badge variant="outline" className="h-5 w-fit px-1.5 py-0 text-[10px]">{(member as any).customRoleTitle}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Space permission</p>
                    {renderPermissionSelect(member, 'min-h-11 w-full')}
                  </div>
                  <div className="mt-2 flex min-h-10 items-center justify-end">
                    {renderMemberActions(member)}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Workspace Role</TableHead>
                  <TableHead>Space Permission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  return (
                    <TableRow key={member._id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar 
                            user={member} 
                            className="h-9 w-9"
                          />
                          <div>
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="capitalize w-fit">
                            {member.workspaceRole}
                          </Badge>
                          {(member as any).customRole ? (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] py-0 px-1.5 h-4 w-fit"
                              style={{ 
                                backgroundColor: (member as any).customRole.color + '20',
                                color: (member as any).customRole.color,
                                borderColor: (member as any).customRole.color + '40'
                              }}
                            >
                              {(member as any).customRole.label}
                            </Badge>
                          ) : (member as any).customRoleTitle && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 w-fit bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                              {(member as any).customRoleTitle}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderPermissionSelect(member, 'min-h-11 w-[170px]')}</TableCell>
                      <TableCell className="text-right">
                        {renderMemberActions(member)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-6">
          Owner bypasses all checks. Then space override applies. Else workspace role fallback.
        </div>
      </DialogContent>
    </Dialog>
  );
}
