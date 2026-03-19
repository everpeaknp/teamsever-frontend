'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Search, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface TableMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  workspaceRole: string;
  tablePermissionLevel: string | null;
  hasOverride: boolean;
  addedBy: string | null;
  addedAt: string | null;
}

interface TableMemberManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableName: string;
  spaceId: string;
  workspaceId: string;
}

export function TableMemberManagement({
  open,
  onOpenChange,
  tableId,
  tableName,
  spaceId,
  workspaceId,
}: TableMemberManagementProps) {
  const [members, setMembers] = useState<TableMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessControlTier, setAccessControlTier] = useState<'basic' | 'pro' | 'advanced'>('basic');

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchAccessControlTier();
    }
  }, [open, tableId, workspaceId]);

  const fetchAccessControlTier = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}`);
      const tier = response.data.data?.subscription?.plan?.features?.accessControlTier || 'basic';
      setAccessControlTier(tier);
    } catch (error) {
      console.error('Failed to fetch access control tier:', error);
      setAccessControlTier('basic');
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tables/${tableId}/table-members`);
      setMembers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch table members:', error);
      toast.error('Failed to load table members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, permissionLevel: string) => {
    try {
      await api.patch(`/tables/${tableId}/table-members/${userId}`, {
        permissionLevel,
      });
      toast.success('Permission updated successfully');
      fetchMembers();
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.delete(`/tables/${tableId}/table-members/${userId}`);
      toast.success('Member removed from table');
      fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleAssignMember = async (userId: string) => {
    try {
      await api.post(`/tables/${tableId}/table-members`, {
        userId,
        permissionLevel: 'FULL', // Default to FULL permission
      });
      
      // Send notification to the assigned member
      try {
        await api.post('/notifications', {
          recipientId: userId,
          type: 'table_assignment',
          title: 'Assigned to Table',
          message: `You've been assigned to table "${tableName}"`,
          link: `/workspace/${workspaceId}/spaces/${spaceId}`,
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
      
      toast.success('Member assigned to table');
      fetchMembers();
    } catch (error) {
      console.error('Failed to assign member:', error);
      toast.error('Failed to assign member');
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

  const getPermissionLabel = (level: string) => {
    const labels: Record<string, string> = {
      FULL: 'Full Access',
      EDIT: 'Can Edit',
      VIEW: 'View Only',
    };
    return labels[level] || level;
  };

  // Simplified access control tier logic (no 'none' tier):
  // basic: Only "Full Access" available (Can Edit and Can View locked)
  // pro: "Full Access" and "Can Edit" available (Can View locked)
  // advanced: All access levels available (Full Access, Can Edit, Can View)
  
  const isCanEditLocked = accessControlTier === 'basic';
  const isCanViewLocked = accessControlTier === 'basic' || accessControlTier === 'pro';

  const getPermissionBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      FULL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
      EDIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      VIEW: 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400',
    };
    return colors[level] || '';
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate assigned and unassigned members
  const assignedMembers = filteredMembers.filter((m) => m.hasOverride);
  const unassignedMembers = filteredMembers.filter((m) => !m.hasOverride);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col dark:bg-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle>Manage Table Members - {tableName}</DialogTitle>
          <DialogDescription>
            Assign members to this table and manage their permissions.
            <br />
            <strong>Full Access:</strong> Create, edit, delete rows/columns (Available in all tiers)
            <br />
            <strong>Can Edit:</strong> Edit cell values only {isCanEditLocked && '(Requires Pro tier or higher)'}
            <br />
            <strong>View Only:</strong> View table only {isCanViewLocked && '(Requires Advanced tier)'}
            {accessControlTier === 'basic' && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
                <strong>Basic Tier:</strong> Members can be assigned "Full Access" only. Upgrade to Pro for "Can Edit" or Advanced for "View Only" permissions.
              </div>
            )}
            {accessControlTier === 'pro' && (
              <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-xs text-purple-800 dark:text-purple-200">
                <strong>Pro Tier:</strong> Members can have "Full Access" or "Can Edit" permissions. Upgrade to Advanced for "View Only" option.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Loading members...</p>
            </div>
          ) : (
            <>
              {/* Assigned Table Members */}
              {assignedMembers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assigned Table Members ({assignedMembers.length})
                  </h3>
                  <div className="space-y-2">
                    {assignedMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-blue-600 text-white text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{member.name}</p>
                              {(member as any).customRoleTitle && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                                  {(member as any).customRoleTitle}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          <Badge className={getPermissionBadgeColor(member.tablePermissionLevel!)}>
                            {getPermissionLabel(member.tablePermissionLevel!)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Select
                            value={member.tablePermissionLevel || 'FULL'}
                            onValueChange={(value) => handleUpdatePermission(member._id, value)}
                          >
                            <SelectTrigger className="w-32 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FULL">
                                Full Access
                              </SelectItem>
                              <SelectItem 
                                value="EDIT"
                                disabled={isCanEditLocked}
                                className={isCanEditLocked ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                Can Edit {isCanEditLocked && '🔒'}
                              </SelectItem>
                              <SelectItem 
                                value="VIEW"
                                disabled={isCanViewLocked}
                                className={isCanViewLocked ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                View Only {isCanViewLocked && '🔒'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member._id)}
                            className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Remove from table"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Space Members (Unassigned) */}
              {unassignedMembers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    Space Members ({unassignedMembers.length})
                  </h3>
                  <div className="space-y-2">
                    {unassignedMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-slate-600 text-white text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{member.name}</p>
                              {(member as any).customRoleTitle && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                                  {(member as any).customRoleTitle}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Workspace: {member.workspaceRole}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAssignMember(member._id)}
                            className="h-9 gap-1"
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No members found</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
