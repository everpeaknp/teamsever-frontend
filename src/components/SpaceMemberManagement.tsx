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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Shield, Edit, MessageSquare, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export type SpacePermissionLevel = 'FULL' | 'EDIT' | 'COMMENT' | 'VIEW';

interface SpaceMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  workspaceRole: string;
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

const PERMISSION_COLORS = {
  FULL: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
  EDIT: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  COMMENT: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  VIEW: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20',
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: spaceColor }} />
            Manage Space Permissions
          </DialogTitle>
          <DialogDescription>
            Set custom permission levels for members in {spaceName}. Overrides
            workspace-level permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
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
                    <TableRow key={member._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback
                              style={{
                                backgroundColor: spaceColor,
                                color: 'white',
                              }}
                            >
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.workspaceRole}
                        </Badge>
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
                          <SelectTrigger className="w-[180px]">
                            <SelectValue>
                              {member.spacePermissionLevel ? (
                                <div className="flex items-center gap-2">
                                  {PermissionIcon && (
                                    <PermissionIcon className="w-4 h-4" />
                                  )}
                                  <span>{member.spacePermissionLevel}</span>
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
                        {member.hasOverride && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOverride(member._id)}
                            disabled={updating === member._id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove Override
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Permission Resolution Order:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Owner always has full access (bypass all checks)</li>
                <li>Space permission override (if set)</li>
                <li>Workspace role permissions (fallback)</li>
              </ol>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
