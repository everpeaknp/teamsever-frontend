'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { RoleSelector } from '@/components/RoleSelector';
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User as UserIcon,
  Eye,
  Link2,
  Copy,
  Check,
  FolderOpen,
  Key,
  Settings2,
  Bell,
  ClipboardList,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/skeletons/PageSkeleton';
import { ICustomRole } from '@/types/pro-features';
import { UserAvatar } from '@/components/ui/user-avatar';

interface Member {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  role: 'owner' | 'admin' | 'operations_manager' | 'project_manager' | 'qa' | 'developer' | 'member' | 'guest';
  isOwner: boolean;
  customRole?: ICustomRole | null;
  customRoleTitle?: string;
  canMarkTaskDone?: boolean;
}

export default function MembersPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { can, isOwner } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxAdmins, setMaxAdmins] = useState<number>(1);
  const [currentAdminCount, setCurrentAdminCount] = useState<number>(0);

  // Fast-Pass invite state
  const [inviteTab, setInviteTab] = useState<'email' | 'link'>('email');
  const [spaces, setSpaces] = useState<any[]>([]);
  const [inviteSpaceId, setInviteSpaceId] = useState<string>('none');
  const [inviteSpacePermission, setInviteSpacePermission] = useState<'FULL' | 'EDIT' | 'COMMENT' | 'VIEW'>('EDIT');
  const [inviteExpiryHours, setInviteExpiryHours] = useState<string>('168'); // Default 7 days
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedShortCode, setGeneratedShortCode] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Custom roles state
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [editingCustomRole, setEditingCustomRole] = useState<{ memberId: string; currentTitle: string } | null>(null);
  const [canUseCustomRoles, setCanUseCustomRoles] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [savingCustomRole, setSavingCustomRole] = useState(false);
  const [maxCustomRoles, setMaxCustomRoles] = useState<number>(0);
  const [currentCustomRoleCount, setCurrentCustomRoleCount] = useState<number>(0);
  const [availableCustomRoles, setAvailableCustomRoles] = useState<ICustomRole[]>([]);
  const initWorkspaceRef = useRef<string | null>(null);

  // Access request state (owner/admin view)
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [resolvingRequest, setResolvingRequest] = useState<string | null>(null);

  // Request access state (non-member view)
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [requestAccessRole, setRequestAccessRole] = useState<string>('member');
  const [requestAccessMessage, setRequestAccessMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [myAccessRequest, setMyAccessRequest] = useState<any | null>(null);

  // Subscription state
  const { canInviteMember: globalCanInviteMember } = useSubscription();
  const { whatsappNumber } = useSystemSettings();

  useEffect(() => {
    if (!workspaceId || initWorkspaceRef.current === workspaceId) return;
    initWorkspaceRef.current = workspaceId;
    fetchMembers();
    fetchCustomRoles();
    checkCustomRoleEntitlement();
    if (can('invite_member')) {
      fetchAccessRequests();
    } else {
      fetchMyAccessRequest();
    }
  }, [workspaceId]);

  const [maxMembers, setMaxMembers] = useState<number>(5);

  const canInviteMember = (currentCount: number) => {
    if (maxMembers === -1) return true; // Unlimited
    return currentCount < maxMembers;
  };

  const fetchCustomRoles = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/custom-roles`);
      setAvailableCustomRoles(res.data.data);
    } catch (error) {
      console.error('Failed to fetch custom roles:', error);
    }
  };

  const fetchSpaces = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/spaces`);
      setSpaces(res.data.data || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (!showInviteModal || spaces.length > 0) return;
    fetchSpaces();
  }, [showInviteModal, spaces.length]);

  // Socket.IO listeners for real-time member updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return;

    console.log('[Members Page] Setting up socket listeners');

    const handleMemberAdded = (data: any) => {
      console.log('[Members Page] Member added:', data);
      if (data.workspaceId === workspaceId) {
        fetchMembers(); // Refresh members list
      }
    };

    const handleMemberRemoved = (data: any) => {
      console.log('[Members Page] Member removed:', data);
      if (data.workspaceId === workspaceId) {
        fetchMembers();
      }
    };

    const handleMemberUpdated = (data: any) => {
      console.log('[Members Page] Member updated:', data);
      if (data.workspaceId === workspaceId) {
        fetchMembers();
      }
    };

    socket.on('member:added', handleMemberAdded);
    socket.on('member:removed', handleMemberRemoved);
    socket.on('member:updated', handleMemberUpdated);

    return () => {
      socket.off('member:added', handleMemberAdded);
      socket.off('member:removed', handleMemberRemoved);
      socket.off('member:updated', handleMemberUpdated);
    };
  }, [workspaceId]);

  const fetchMembers = async () => {
    try {
      setError(null);
      console.log('[Members Page] Fetching workspace data for:', workspaceId);
      
      const [membersRes, workspaceRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/members`),
        api.get(`/workspaces/${workspaceId}`)
      ]);
      
      console.log('[Members Page] Raw workspace response:', workspaceRes.data);
      
      setMembers(membersRes.data.data);
      
      // CRITICAL FIX: Access workspace data correctly - it's nested under data.data
      const workspace = workspaceRes.data.data;
      
      // Debug logging
      console.log('[Members Page] Workspace object:', {
        hasSubscription: !!workspace?.subscription,
        hasResolvedFeatures: !!workspace?.subscription?.resolvedFeatures,
        hasPlanFeatures: !!workspace?.subscription?.plan?.features,
        resolvedFeatures: workspace?.subscription?.resolvedFeatures,
        planFeatures: workspace?.subscription?.plan?.features
      });
      
      // Get max admins from owner's subscription - use resolved features directly
      const resolvedFeatures = workspace?.subscription?.resolvedFeatures;
      const planFeatures = workspace?.subscription?.plan?.features;
      
      const maxAdminsLimit = resolvedFeatures?.maxAdmins ?? planFeatures?.maxAdmins ?? 1;
      setMaxAdmins(maxAdminsLimit);
      
      console.log('[Members Page] Max Admins:', maxAdminsLimit);
      
      // Count current admins
      const adminCount = membersRes.data.data.filter((m: Member) => m.role === 'admin').length;
      setCurrentAdminCount(adminCount);
      
      // Get max custom roles from owner's subscription - use resolved features directly
      const maxCustomRolesLimit = resolvedFeatures?.maxCustomRoles ?? planFeatures?.maxCustomRoles ?? 0;
      setMaxCustomRoles(maxCustomRolesLimit);
      
      const maxMembersLimit = resolvedFeatures?.maxMembers ?? planFeatures?.maxMembers ?? 5;
      setMaxMembers(maxMembersLimit);
      
      console.log('[Members Page] Max Custom Roles:', maxCustomRolesLimit);
      console.log('[Members Page] Resolved Features maxCustomRoles:', resolvedFeatures?.maxCustomRoles);
      console.log('[Members Page] Plan Features maxCustomRoles:', planFeatures?.maxCustomRoles);
      
      // Count current custom roles
      const customRoleCount = membersRes.data.data.filter((m: Member) => m.customRoleTitle && m.customRoleTitle.trim() !== '').length;
      setCurrentCustomRoleCount(customRoleCount);
    } catch (error: any) {
      console.error('Failed to fetch members:', error);
      setError(error.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const isCustom = newRole.startsWith('custom:');
    const roleId = isCustom ? newRole.split(':')[1] : null;

    // Check if changing to admin and limit is reached
    if (!isCustom && newRole === 'admin') {
      const currentMember = members.find(m => m._id === userId);
      if (currentMember && currentMember.role !== 'admin') {
        // This would be a new admin
        if (maxAdmins !== -1 && currentAdminCount >= maxAdmins) {
          toast.error(`You've reached your admin limit (${maxAdmins}). Upgrade your plan to add more admins.`);
          setShowUpgradeModal(true);
          return;
        }
      }
    }

    try {
      setUpdating(userId);
      setError(null);

      if (isCustom) {
        // Assign Custom Role
        await api.patch(`/workspaces/${workspaceId}/members/${userId}/custom-role`, {
          customRoleId: roleId
        });
      } else {
        // Assign Standard Role
        await api.patch(`/workspaces/${workspaceId}/members/${userId}`, {
          role: newRole,
          customRole: null // Clear custom role if standard role is selected
        });
      }

      toast.success(isCustom ? 'Custom role assigned' : 'Member role updated');
      fetchMembers(); // Refresh to get the fully populated customRole object
    } catch (error: any) {
      if (error?.response?.status !== 403) {
        console.error('Failed to update role:', error);
      }
      const errorMessage = error.response?.data?.message || 'Failed to update role';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  const handleDoneApprovalToggle = async (userId: string, canMarkTaskDone: boolean) => {
    try {
      setUpdating(userId);
      setError(null);
      await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { canMarkTaskDone });
      setMembers((prev) =>
        prev.map((member) =>
          member._id === userId ? { ...member, canMarkTaskDone } : member
        )
      );
      toast.success(canMarkTaskDone ? 'Done approval enabled' : 'Done approval disabled');
    } catch (error: any) {
      console.error('Failed to update done-approval toggle:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update permission';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      setError(null);
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      setMembers(members.filter((member) => member._id !== userId));
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      setError(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleMemberUpdate = (memberId: string, updates: Partial<Member>) => {
    setMembers(prevMembers =>
      prevMembers.map(member =>
        member._id === memberId ? { ...member, ...updates } : member
      )
    );
    // Refresh the member list to get the latest data
    fetchMembers();
  };

  // Wrapper to handle IWorkspaceMember updates
  const handleWorkspaceMemberUpdate = (memberId: string, updates: Partial<import('@/types/pro-features').IWorkspaceMember>) => {
    // Convert IWorkspaceMember updates to Member updates
    const { customRole, ...rest } = updates;
    const memberUpdates = {
      ...rest,
      customRoleTitle: updates.customRoleTitle === null ? undefined : updates.customRoleTitle,
      // Only include customRole if it's an object, not a string ID
      ...(typeof customRole === 'object' && { customRole: customRole as any })
    } as any;
    handleMemberUpdate(memberId, memberUpdates);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const currentMemberCount = members.length;
    if (!canInviteMember(currentMemberCount)) {
      setShowUpgradeModal(true);
      setShowInviteModal(false);
      return;
    }

    try {
      setInviting(true);
      setError(null);

      await api.post(`/workspaces/${workspaceId}/invites`, {
        email: inviteEmail.trim(),
        role: inviteRole,
        inviteType: 'email',
        expiresInHours: parseInt(inviteExpiryHours),
        ...(inviteSpaceId && inviteSpaceId !== 'none' && { spaceId: inviteSpaceId, spacePermissionLevel: inviteSpacePermission }),
      });

      toast.success(`Invitation sent to ${inviteEmail}!`);
      resetInviteModal();
    } catch (error: any) {
      if (error.response?.data?.code === 'MEMBER_LIMIT_REACHED') {
        toast.error(error.response?.data?.message || 'Member limit reached.');
        setShowUpgradeModal(true);
        setShowInviteModal(false);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to invite member';
        toast.error(errorMessage);
        setError(errorMessage);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleGenerateLink = async () => {
    const currentMemberCount = members.length;
    if (!canInviteMember(currentMemberCount)) {
      setShowUpgradeModal(true);
      setShowInviteModal(false);
      return;
    }

    try {
      setInviting(true);
      setError(null);

      const res = await api.post(`/workspaces/${workspaceId}/invites`, {
        inviteType: 'link',
        role: inviteRole,
        expiresInHours: parseInt(inviteExpiryHours),
        ...(inviteSpaceId && inviteSpaceId !== 'none' && { spaceId: inviteSpaceId, spacePermissionLevel: inviteSpacePermission }),
      });

      const token = res.data.data?.token;
      const shortCode = res.data.data?.shortCode;
      if (token) {
        const link = `${window.location.origin}/join?token=${token}`;
        setGeneratedLink(link);
        setGeneratedShortCode(shortCode);
        toast.success('Invite link generated!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate link');
    } finally {
      setInviting(false);
    }
  };

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setError(null);
    setInviteEmail('');
    setInviteRole('member');
    setInviteTab('email');
    setInviteSpaceId('none');
    setInviteSpacePermission('EDIT');
    setInviteExpiryHours('168');
    setGeneratedLink(null);
    setGeneratedShortCode(null);
    setLinkCopied(false);
    setCodeCopied(false);
    fetchMembers();
  };

  // Custom role functions
  const checkCustomRoleEntitlement = async () => {
    try {
      const response = await api.get('/entitlements/check', {
        params: { 
          action: 'useCustomRoles',
          workspaceId: workspaceId // Pass workspace ID to check owner's plan
        },
      });
      setCanUseCustomRoles(response.data.allowed);
    } catch (error: any) {
      console.error('Failed to check custom role entitlement:', error);
      setCanUseCustomRoles(false);
    }
  };

  // ─── Access request functions ───────────────────────────────────────────────

  const fetchAccessRequests = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/access-requests`);
      setAccessRequests(res.data.data || []);
    } catch {
      // non-critical — owner may not have permission or feature not yet used
    }
  };

  const fetchMyAccessRequest = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/access-requests/my`);
      setMyAccessRequest(res.data.data || null);
    } catch {
      // non-critical
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setResolvingRequest(requestId);
    try {
      await api.patch(`/workspaces/${workspaceId}/access-requests/${requestId}/approve`);
      toast.success('Request approved — user has been added to the workspace');
      setAccessRequests(prev => prev.filter(r => r._id !== requestId));
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setResolvingRequest(null);
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    setResolvingRequest(requestId);
    try {
      await api.patch(`/workspaces/${workspaceId}/access-requests/${requestId}/deny`);
      toast.success('Request denied');
      setAccessRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deny request');
    } finally {
      setResolvingRequest(null);
    }
  };

  const handleSubmitAccessRequest = async () => {
    setSubmittingRequest(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/access-requests`, {
        requestedRole: requestAccessRole,
        message: requestAccessMessage.trim(),
      });
      setMyAccessRequest(res.data.data);
      setShowRequestAccessModal(false);
      setRequestAccessMessage('');
      toast.success('Access request sent! The workspace owner has been notified.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleOpenCustomRoleModal = (memberId: string, currentTitle?: string) => {
    console.log('[handleOpenCustomRoleModal] Called with:', {
      memberId,
      currentTitle,
      canUseCustomRoles,
      maxCustomRoles,
      currentCustomRoleCount
    });
    
    if (!canUseCustomRoles) {
      console.log('[handleOpenCustomRoleModal] Feature not enabled, showing upgrade modal');
      setShowUpgradeModal(true);
      return;
    }
    
    // Check if adding a new custom role (not editing existing)
    if (!currentTitle) {
      console.log('[handleOpenCustomRoleModal] Adding new role, checking limit...');
      // Check if limit is reached
      if (maxCustomRoles !== -1 && currentCustomRoleCount >= maxCustomRoles) {
        console.log('[handleOpenCustomRoleModal] Limit reached!', {
          maxCustomRoles,
          currentCustomRoleCount,
          limitReached: true
        });
        toast.error(`You've reached your custom role limit (${currentCustomRoleCount}/${maxCustomRoles}). Upgrade your plan to add more custom roles.`);
        setShowUpgradeModal(true);
        return;
      }
      console.log('[handleOpenCustomRoleModal] Limit check passed');
    } else {
      console.log('[handleOpenCustomRoleModal] Editing existing role, skipping limit check');
    }
    
    setEditingCustomRole({ memberId, currentTitle: currentTitle || '' });
    setCustomRoleTitle(currentTitle || '');
    setShowCustomRoleModal(true);
  };

  const handleSaveCustomRole = async () => {
    if (!editingCustomRole) return;

    setSavingCustomRole(true);
    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/members/${editingCustomRole.memberId}/custom-role`,
        { customRoleTitle: customRoleTitle.trim() || null }
      );
      
      // Update local state
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member._id === editingCustomRole.memberId
            ? { ...member, customRoleTitle: customRoleTitle.trim() || undefined, role: 'member' }
            : member
        )
      );
      
      // Update custom role count
      const wasAdding = !editingCustomRole.currentTitle && customRoleTitle.trim();
      const wasRemoving = editingCustomRole.currentTitle && !customRoleTitle.trim();
      
      if (wasAdding) {
        setCurrentCustomRoleCount(prev => prev + 1);
      } else if (wasRemoving) {
        setCurrentCustomRoleCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success(customRoleTitle.trim() ? 'Custom role assigned' : 'Custom role removed');
      setShowCustomRoleModal(false);
      setEditingCustomRole(null);
      setCustomRoleTitle('');
    } catch (error: any) {
      console.error('Failed to assign custom role:', error);
      
      // Check for limit error
      if (error.response?.data?.code === 'CUSTOM_ROLE_LIMIT_REACHED') {
        const currentCount = error.response?.data?.currentCount || 0;
        const maxAllowed = error.response?.data?.maxAllowed || 0;
        toast.error(`Custom role limit reached (${currentCount}/${maxAllowed}). Upgrade your plan to add more custom roles.`);
        setShowUpgradeModal(true);
        setShowCustomRoleModal(false);
      } else {
        toast.error(error.response?.data?.message || 'Failed to assign custom role');
      }
    } finally {
      setSavingCustomRole(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'operations_manager':
        return 'Operations Manager';
      case 'project_manager':
        return 'Project Manager';
      case 'qa':
        return 'QA';
      case 'developer':
        return 'Developer';
      case 'member':
        return 'Member';
      case 'guest':
        return 'Guest';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" strokeWidth={1.5} />;
      case 'operations_manager':
        return <Settings2 className="w-4 h-4 text-orange-500" strokeWidth={1.5} />;
      case 'project_manager':
        return <FolderOpen className="w-4 h-4 text-purple-500" strokeWidth={1.5} />;
      case 'qa':
        return <Check className="w-4 h-4 text-amber-500" strokeWidth={1.5} />;
      case 'developer':
        return <Key className="w-4 h-4 text-green-500" strokeWidth={1.5} />;
      case 'member':
        return <UserIcon className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />;
      case 'guest':
        return <Eye className="w-4 h-4 text-gray-500" strokeWidth={1.5} />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'operations_manager':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'project_manager':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'qa':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'developer':
        return 'bg-blue-100 text-blue-800 border-blue-300'; // Similar to admin but lighter? Or use green
      case 'member':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'guest':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="w-full px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Workspace Members</h1>
                <p className="text-sm text-muted-foreground">{members.length} members</p>
              </div>
            </div>
            {can('invite_member') && (
              <div className="flex gap-2 w-full sm:w-auto">
                {can('MANAGE_CUSTOM_ROLES') && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/workspace/${workspaceId}/settings/roles`)}
                    className="flex items-center gap-2 min-h-[44px]"
                  >
                    <Settings2 className="w-4 h-4" strokeWidth={1.5} />
                    Manage Roles
                  </Button>
                )}
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                  Invite Member
                </Button>
              </div>
            )}
            {!can('invite_member') && (
              <div className="flex-shrink-0">
                {myAccessRequest?.status === 'pending' ? (
                  <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400">
                    <Bell className="w-4 h-4" strokeWidth={1.5} />
                    Request Pending
                  </Badge>
                ) : myAccessRequest?.status === 'approved' ? (
                  <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 border-green-300">
                    <Check className="w-4 h-4" strokeWidth={1.5} />
                    Access Approved
                  </Badge>
                ) : myAccessRequest?.status === 'denied' ? (
                  <Button
                    variant="outline"
                    onClick={() => { setMyAccessRequest(null); setShowRequestAccessModal(true); }}
                    className="flex items-center gap-2 min-h-[44px]"
                  >
                    <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                    Request Again
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowRequestAccessModal(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
                  >
                    <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                    Request Access
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Pending Access Requests Panel — owner/admin only */}
        {can('invite_member') && accessRequests.length > 0 && (
          <div className="mb-6 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20">
              <Bell className="w-4 h-4 text-yellow-600 dark:text-yellow-400" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                Pending Access Requests ({accessRequests.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {accessRequests.map((req: any) => (
                <div key={req._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {req.requester?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{req.requester?.email}</p>
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{req.message}"</p>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize text-xs shrink-0">
                    {req.requestedRole.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequest(req._id)}
                      disabled={resolvingRequest === req._id}
                      className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs"
                    >
                      {resolvingRequest === req._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDenyRequest(req._id)}
                      disabled={resolvingRequest === req._id}
                      className="h-8 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Can Mark Done</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member._id}>
                  {/* Avatar */}
                  <TableCell>
                    <UserAvatar
                      user={member}
                      className="w-10 h-10"
                    />
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-medium text-card-foreground">
                    <div className="flex items-center gap-2">
                      {member.name}
                      {member.isOwner && (
                        <Crown className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                      )}
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>

                  {/* Role */}
                  <TableCell>
                    {can('change_member_role') && !member.isOwner ? (
                      updating === member._id ? (
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <RoleSelector
                          value={member.role}
                          customRole={member.customRole}
                          availableCustomRoles={availableCustomRoles}
                          onChange={(value) => handleRoleChange(member._id, value)}
                          onAddCustomRole={() => handleOpenCustomRoleModal(member._id, member.customRole?.label)}
                          onAssignCustomRole={(roleId) => handleRoleChange(member._id, `custom:${roleId}`)}
                          canUseCustomRoles={canUseCustomRoles}
                        />
                      )
                    ) : (
                      member.customRole ? (
                        <Badge
                          variant="outline"
                          style={{ 
                            backgroundColor: member.customRole.color + '15', 
                            color: member.customRole.color, 
                            borderColor: member.customRole.color + '40' 
                          }}
                          className="flex items-center gap-2 w-fit border"
                        >
                          <Shield className="w-4 h-4" strokeWidth={1.5} />
                          {member.customRole.label}
                        </Badge>
                      ) : member.customRoleTitle ? (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-2 w-fit bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400"
                        >
                          <UserIcon className="w-4 h-4" strokeWidth={1.5} />
                          {member.customRoleTitle}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-2 w-fit ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {getRoleIcon(member.role)}
                          {getRoleLabel(member.role)}
                        </Badge>
                      )
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {!member.isOwner ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!member.canMarkTaskDone}
                          onCheckedChange={(checked) => handleDoneApprovalToggle(member._id, checked)}
                          disabled={!can('change_member_role') || updating === member._id}
                        />
                        <span className="text-xs text-muted-foreground">
                          {member.canMarkTaskDone ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Always allowed</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    {can('remove_member') && !member.isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="md:hidden space-y-4">
          {members.map((member) => (
            <div key={member._id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-start gap-3 mb-3">
                <UserAvatar
                  user={member}
                  className="w-12 h-12 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-card-foreground truncate">{member.name}</h3>
                    {member.isOwner && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {can('change_member_role') && !member.isOwner ? (
                  updating === member._id ? (
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md flex-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <RoleSelector
                      value={member.role}
                      customRole={member.customRole}
                      availableCustomRoles={availableCustomRoles}
                      onChange={(value) => handleRoleChange(member._id, value)}
                      onAddCustomRole={() => handleOpenCustomRoleModal(member._id, member.customRole?.label)}
                      onAssignCustomRole={(roleId) => handleRoleChange(member._id, `custom:${roleId}`)}
                      canUseCustomRoles={canUseCustomRoles}
                      disabled={updating === member._id}
                    />
                  )
                ) : (
                  member.customRoleTitle ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-2 bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400"
                    >
                      <UserIcon className="w-4 h-4" />
                      {member.customRoleTitle}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-2 ${getRoleBadgeColor(member.role)}`}
                    >
                      {getRoleIcon(member.role)}
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  )
                )}

                {can('remove_member') && !member.isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member._id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {!member.isOwner && (
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Can mark task as Done</span>
                  <Switch
                    checked={!!member.canMarkTaskDone}
                    onCheckedChange={(checked) => handleDoneApprovalToggle(member._id, checked)}
                    disabled={!can('change_member_role') || updating === member._id}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Role Descriptions */}
        <div className="mt-8 bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Owner</h4>
                <p className="text-sm text-muted-foreground">
                  Full control over workspace, can delete workspace and change member roles
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Can create/delete spaces, invite members, and manage settings
                </p>
                {maxAdmins !== -1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      currentAdminCount >= maxAdmins 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    }`}>
                      {currentAdminCount}/{maxAdmins} Admins
                    </div>
                    {currentAdminCount >= maxAdmins && (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Upgrade to add more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Settings2 className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Operations Manager</h4>
                <p className="text-sm text-muted-foreground">
                  High-level oversight, manages settings, analytics, and member invites
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FolderOpen className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Project Manager</h4>
                <p className="text-sm text-muted-foreground">
                  Manages spaces, folders, lists, and full task control
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Key className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Developer</h4>
                <p className="text-sm text-muted-foreground">
                  Full task collaboration, status changes, and time tracking
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">QA</h4>
                <p className="text-sm text-muted-foreground">
                  Bug reporting, task creation, and status verification
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <UserIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Member</h4>
                <p className="text-sm text-muted-foreground">
                  Collaborate on tasks and participate in workspace activity
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Eye className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-card-foreground">Guest</h4>
                <p className="text-sm text-muted-foreground">
                  Read-only access to assigned workspace content
                </p>
              </div>
            </div>
            {canUseCustomRoles && (
              <div className="flex gap-3 md:col-span-2">
                <UserIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-card-foreground">Custom Roles</h4>
                  <p className="text-sm text-muted-foreground">
                    Create custom role titles with member permissions
                  </p>
                  {maxCustomRoles !== -1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                        currentCustomRoleCount >= maxCustomRoles 
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                          : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                      }`}>
                        {currentCustomRoleCount}/{maxCustomRoles} Custom Roles
                      </div>
                      {currentCustomRoleCount >= maxCustomRoles && (
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Upgrade to add more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Custom Role Modal */}
      {showCustomRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border">
            <h3 className="text-xl font-bold text-card-foreground mb-4">
              {editingCustomRole?.currentTitle ? 'Edit Custom Role' : 'Create Custom Role'}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="customRoleTitle">Role Title</Label>
                <Input
                  id="customRoleTitle"
                  value={customRoleTitle}
                  onChange={(e) => setCustomRoleTitle(e.target.value)}
                  placeholder="e.g., QA Engineer, Project Manager"
                  maxLength={50}
                  className="min-h-[44px]"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This role will have member permissions but display as "{customRoleTitle || 'Custom Role'}"
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomRoleModal(false);
                  setEditingCustomRole(null);
                  setCustomRoleTitle('');
                }}
                disabled={savingCustomRole}
                className="flex-1 min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustomRole}
                disabled={savingCustomRole || !customRoleTitle.trim()}
                className="flex-1 min-h-[44px]"
              >
                {savingCustomRole ? 'Saving...' : 'Save Role'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-4 sm:p-6 w-full max-w-md border border-border">
            <h3 className="text-lg sm:text-xl font-bold text-card-foreground mb-4">Invite Member</h3>

            {/* Tab toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
              <button
                onClick={() => { setInviteTab('email'); setGeneratedLink(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  inviteTab === 'email' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Email Invite
              </button>
              <button
                onClick={() => { setInviteTab('link'); setGeneratedLink(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  inviteTab === 'link' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Key className="w-4 h-4" /> Invite Code
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4 mb-4">
              {/* Email field — only for email tab */}
              {inviteTab === 'email' && (
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    disabled={inviting}
                    className="min-h-[44px]"
                  />
                </div>
              )}

              {/* Workspace Role */}
              <div>
                <Label>Workspace Role</Label>
                <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)} disabled={inviting}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" />Admin</div>
                    </SelectItem>
                    <SelectItem value="operations_manager">
                      <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-orange-500" />Operations Manager</div>
                    </SelectItem>
                    <SelectItem value="project_manager">
                      <div className="flex items-center gap-2"><FolderOpen className="w-4 h-4 text-purple-500" />Project Manager</div>
                    </SelectItem>
                    <SelectItem value="developer">
                      <div className="flex items-center gap-2"><Key className="w-4 h-4 text-green-500" />Developer</div>
                    </SelectItem>
                    <SelectItem value="qa">
                      <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" />QA</div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-emerald-500" />Member</div>
                    </SelectItem>
                    <SelectItem value="guest">
                      <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-gray-500" />Guest</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Invitation Expiry */}
              <div>
                <Label>Invitation Expires In</Label>
                <Select value={inviteExpiryHours} onValueChange={setInviteExpiryHours} disabled={inviting}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Hours</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="72">3 Days</SelectItem>
                    <SelectItem value="168">7 Days</SelectItem>
                    <SelectItem value="720">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional: Assign to a Space */}
              <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-foreground">Auto-assign to Space</span>
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </div>

                <Select
                  value={inviteSpaceId}
                  onValueChange={setInviteSpaceId}
                  disabled={inviting}
                >
                  <SelectTrigger className="min-h-[40px]">
                    <SelectValue placeholder="No space selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No space (workspace only)</SelectItem>
                    {spaces.map((space: any) => (
                      <SelectItem key={space._id} value={space._id}>{space.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {inviteSpaceId && inviteSpaceId !== 'none' && (
                  <Select
                    value={inviteSpacePermission}
                    onValueChange={(v: any) => setInviteSpacePermission(v)}
                    disabled={inviting}
                  >
                    <SelectTrigger className="min-h-[40px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL"><div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" />FULL — full control</div></SelectItem>
                      <SelectItem value="EDIT"><div className="flex items-center gap-2"><UserIcon className="w-3.5 h-3.5" />EDIT — create &amp; edit tasks</div></SelectItem>
                      <SelectItem value="COMMENT"><div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" />COMMENT — comment only</div></SelectItem>
                      <SelectItem value="VIEW"><div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" />VIEW — read only</div></SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Generated link & code display */}
                  {generatedShortCode && (
                    <div className="bg-[#135bec]/5 border border-[#135bec]/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-[#135bec] font-semibold flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5" /> Mobile Invite Code
                        </p>
                        <Badge variant="outline" className="bg-white text-[10px] py-0 border-[#135bec]/20 text-[#135bec]">READY</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-2xl font-mono font-bold tracking-[0.2em] text-[#135bec] text-center bg-white/50 py-2 rounded border border-[#135bec]/5">{generatedShortCode}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedShortCode);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                          className="flex-shrink-0 p-2.5 rounded bg-[#135bec] text-white hover:bg-[#135bec]/90 transition-colors shadow-sm"
                          title="Copy code"
                        >
                          {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3 text-center">Mobile users can enter this code in their dashboard to join instantly.</p>
                    </div>
                  )}


                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetInviteModal}
                    disabled={inviting}
                    className="flex-1 min-h-[44px]"
                  >
                    {generatedLink ? 'Done' : 'Cancel'}
                  </Button>

                  {inviteTab === 'email' ? (
                    <Button
                      onClick={handleInviteMember as any}
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
                    >
                      {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inviting...</> : 'Send Invite'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleGenerateLink}
                      disabled={inviting || !!generatedLink}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
                    >
                      {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : generatedLink ? 'Code Ready ✓' : 'Generate Invite Code'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Modal */}
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            reason="member"
            currentCount={members.length}
            maxAllowed={5}
            workspaceName="Workspace"
            whatsappNumber={whatsappNumber}
          />

          {/* Request Access Modal */}
          {showRequestAccessModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    Request Workspace Access
                  </h3>
                  <button
                    onClick={() => setShowRequestAccessModal(false)}
                    className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Submit a request to join this workspace. The owner will be notified and can approve or deny it.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="requestRole">Requested Role</Label>
                    <Select value={requestAccessRole} onValueChange={setRequestAccessRole} disabled={submittingRequest}>
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" />Admin</div>
                        </SelectItem>
                        <SelectItem value="project_manager">
                          <div className="flex items-center gap-2"><FolderOpen className="w-4 h-4 text-purple-500" />Project Manager</div>
                        </SelectItem>
                        <SelectItem value="developer">
                          <div className="flex items-center gap-2"><Key className="w-4 h-4 text-green-500" />Developer</div>
                        </SelectItem>
                        <SelectItem value="qa">
                          <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" />QA</div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-emerald-500" />Member</div>
                        </SelectItem>
                        <SelectItem value="guest">
                          <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-gray-500" />Guest</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="requestMessage">Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <textarea
                      id="requestMessage"
                      value={requestAccessMessage}
                      onChange={(e) => setRequestAccessMessage(e.target.value)}
                      placeholder="Briefly explain why you need access..."
                      maxLength={500}
                      rows={3}
                      disabled={submittingRequest}
                      className="w-full mt-1.5 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">{requestAccessMessage.length}/500</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowRequestAccessModal(false)}
                    disabled={submittingRequest}
                    className="flex-1 min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitAccessRequest}
                    disabled={submittingRequest}
                    className="flex-1 min-h-[44px]"
                  >
                    {submittingRequest ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                    ) : (
                      'Send Request'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
