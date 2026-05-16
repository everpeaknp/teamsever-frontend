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
      console.error('Failed to fetch space members:', error);
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
      console.error('Failed to update permission:', error);
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
      console.error('Failed to remove override:', error);
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
      console.error('Failed to remove member from space:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[78vh] overflow-hidden flex flex-col rounded-2xl border border-border bg-background p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Space Permissions
          </DialogTitle>
          <DialogDescription className="text-sm">
            Members inside {spaceName}. Invite from the separate invite modal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
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
          ) : (
            <Table>
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
                  const PermissionIcon = member.spacePermissionLevel
                    ? PERMISSION_ICONS[member.spacePermissionLevel]
                    : null;

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
                      <TableCell>
                        <Select
                          value={member.spacePermissionLevel || 'default'}
                          onValueChange={(value) => {
                            if (value === 'default') {
                              handleRemoveOverride(member._id);
                            } else {
                              handleUpdatePermission(
                                member._id,
                                value as SpacePermissionLevel
                              );
                            }
                          }}
                          disabled={updating === member._id}
                        >
                          <SelectTrigger className="w-[170px] h-9">
                            <SelectValue>
                              {member.spacePermissionLevel ? (
                                <div className="flex items-center gap-2">
                                  {PermissionIcon && (
                                    <PermissionIcon className="w-4 h-4" />
                                  )}
                                    <span className="text-sm">{member.spacePermissionLevel}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                  Use workspace role
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">
                              <div className="flex flex-col items-start">
                                <span>Use Workspace Role</span>
                                <span className="text-xs text-muted-foreground">
                                  No override
                                </span>
                              </div>
                            </SelectItem>
                            {Object.entries(PERMISSION_DESCRIPTIONS).map(
                              ([level, description]) => {
                                const Icon = PERMISSION_ICONS[level as SpacePermissionLevel];
                                return (
                                  <SelectItem key={level} value={level}>
                                    <div className="flex items-start gap-2">
                                      <Icon className="w-4 h-4 mt-0.5" />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{level}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {description}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              }
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {member.hasOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOverride(member._id)}
                              disabled={updating === member._id}
                              className="h-8 px-2.5 text-xs"
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
                              className="h-8 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
          Owner bypasses all checks. Then space override applies. Else workspace role fallback.
        </div>
      </DialogContent>
    </Dialog>
  );
}
