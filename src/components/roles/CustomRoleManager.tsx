'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { IWorkspaceMember } from '@/types/pro-features';
import { api } from '@/lib/axios';
import { UpgradePrompt } from './UpgradePrompt';
import { toast } from 'sonner';

interface CustomRoleManagerProps {
  workspaceId: string;
  members: IWorkspaceMember[];
  currentUserRole: 'owner' | 'admin' | 'member' | 'guest';
  onMemberUpdate: (memberId: string, updates: Partial<IWorkspaceMember>) => void;
}

export const CustomRoleManager: React.FC<CustomRoleManagerProps> = ({
  workspaceId,
  members,
  currentUserRole,
  onMemberUpdate,
}) => {
  const [canUseCustomRoles, setCanUseCustomRoles] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkCustomRoleEntitlement();
  }, []);

  const checkCustomRoleEntitlement = async () => {
    try {
      const response = await api.get('/entitlements/check', {
        params: { action: 'useCustomRoles' },
      });
      setCanUseCustomRoles(response.data.allowed);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to check entitlement';
      console.error('Failed to check custom role entitlement:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setCanUseCustomRoles(false);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCustomRole = async (memberId: string, title: string | null) => {
    setSaving(true);
    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/members/${memberId}/custom-role`,
        { customRoleTitle: title }
      );
      onMemberUpdate(memberId, response.data.member);
      setEditingMember(null);
      setCustomRoleTitle('');
      toast.success(title ? 'Custom role assigned' : 'Custom role removed');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to assign custom role';
      console.error('Failed to assign custom role:', {
        workspaceId,
        memberId,
        title,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (member: IWorkspaceMember) => {
    const userId = typeof member.user === 'string' ? member.user : member.user._id;
    setEditingMember(userId);
    setCustomRoleTitle(member.customRoleTitle || '');
  };

  const handleSave = () => {
    if (editingMember) {
      handleAssignCustomRole(editingMember, customRoleTitle || null);
    }
  };

  const handleRemove = (memberId: string) => {
    handleAssignCustomRole(memberId, null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  // Only show to workspace owners
  if (currentUserRole !== 'owner') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Roles</h3>
        {!canUseCustomRoles ? (
          <Button
            variant="outline"
            onClick={() => setShowUpgradePrompt(true)}
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            <span>Pro Feature</span>
          </Button>
        ) : null}
      </div>

      {canUseCustomRoles && (
        <div className="space-y-2">
          {members.map((member) => {
            const userId = typeof member.user === 'string' ? member.user : member.user._id;
            const userName = typeof member.user === 'string' ? 'Unknown' : member.user.name;
            const userEmail = typeof member.user === 'string' ? '' : member.user.email;

            return (
              <div
                key={userId}
                className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="font-medium">{userName}</div>
                  <div className="text-sm text-gray-500">{userEmail}</div>
                  <div className="text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Role: </span>
                    <span className="font-medium">
                      {member.customRoleTitle || member.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(member)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {member.customRoleTitle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingMember !== null} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Custom Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Custom Role Title</label>
              <Input
                value={customRoleTitle}
                onChange={(e) => setCustomRoleTitle(e.target.value)}
                placeholder="e.g., Project Manager, Lead Developer"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use default role name
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        show={showUpgradePrompt}
        feature="customRoles"
        currentPlan="Free"
        requiredPlan="Pro"
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          window.location.href = '/pricing';
        }}
      />
    </div>
  );
};
