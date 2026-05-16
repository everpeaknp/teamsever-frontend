'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Shield, 
  ShieldCheck,
  Workflow,
  Layers,
  Code2,
  Crown,
  User,
  Eye,
  Info,
  CheckCircle2,
  XCircle,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ICustomRole } from '@/types/pro-features';
import { TableSkeleton } from '@/components/skeletons/PageSkeleton';

const PERMISSION_GROUPS = [
  {
    name: 'Workspace',
    permissions: [
      { id: 'VIEW_WORKSPACE', label: 'View Workspace' },
      { id: 'UPDATE_WORKSPACE', label: 'Update Workspace' },
      { id: 'INVITE_MEMBER', label: 'Invite Members' },
      { id: 'REMOVE_MEMBER', label: 'Remove Members' },
      { id: 'CHANGE_MEMBER_ROLE', label: 'Change Member Roles' },
      { id: 'MANAGE_CUSTOM_ROLES', label: 'Manage Custom Roles' },
    ]
  },
  {
    name: 'Spaces & Folders',
    permissions: [
      { id: 'CREATE_SPACE', label: 'Create Space' },
      { id: 'UPDATE_SPACE', label: 'Update Space' },
      { id: 'DELETE_SPACE', label: 'Delete Space' },
      { id: 'ADD_SPACE_MEMBER', label: 'Add Space Members' },
      { id: 'MANAGE_SPACE_PERMISSIONS', label: 'Manage Space Permissions' },
      { id: 'CREATE_FOLDER', label: 'Create Folder' },
      { id: 'UPDATE_FOLDER', label: 'Update Folder' },
      { id: 'DELETE_FOLDER', label: 'Delete Folder' },
    ]
  },
  {
    name: 'Lists & Tasks',
    permissions: [
      { id: 'CREATE_LIST', label: 'Create List' },
      { id: 'UPDATE_LIST', label: 'Update List' },
      { id: 'DELETE_LIST', label: 'Delete List' },
      { id: 'CREATE_TASK', label: 'Create Task' },
      { id: 'EDIT_TASK', label: 'Edit Task' },
      { id: 'DELETE_TASK', label: 'Delete Task' },
      { id: 'ASSIGN_TASK', label: 'Assign Tasks' },
      { id: 'CHANGE_STATUS', label: 'Change Status' },
      { id: 'COMMENT_TASK', label: 'Comment on Tasks' },
    ]
  },
  {
    name: 'Analytics & Settings',
    permissions: [
      { id: 'VIEW_ANALYTICS', label: 'View Analytics' },
      { id: 'VIEW_ACTIVITY_LOG', label: 'View Activity Log' },
      { id: 'MANAGE_SETTINGS', label: 'Manage Settings' },
    ]
  }
];

const NATIVE_ROLES = [
  {
    name: 'Owner',
    label: 'OWNER',
    color: '#EF4444',
    description: 'System creator: full bypass, workspace deletion, and ultimate authority over all resources.',
    icon: Crown
  },
  {
    name: 'Admin',
    label: 'ADMIN',
    color: '#3B82F6',
    description: 'Full workspace management: create/delete spaces, invite members, and manage all settings.',
    icon: ShieldCheck
  },
  {
    name: 'Operations Manager',
    label: 'OPS',
    color: '#F97316',
    description: 'High-level oversight: manages settings, analytics, activity logs, and member invitations.',
    icon: Workflow
  },
  {
    name: 'Project Manager',
    label: 'PM',
    color: '#A855F7',
    description: 'Execution focus: manages spaces, folders, lists, and has full task management control.',
    icon: Layers
  },
  {
    name: 'Developer',
    label: 'DEV',
    color: '#10B981',
    description: 'Collaboration focus: create tasks, change statuses, track time, and full task interaction.',
    icon: Code2
  },
  {
    name: 'QA',
    label: 'QA',
    color: '#F59E0B',
    description: 'Quality focus: bug reporting, task creation, status verification, and commenting.',
    icon: CheckCircle2
  },
  {
    name: 'Member',
    label: 'MEMBER',
    color: '#10B981',
    description: 'Standard collaboration: participate in assigned tasks and workspace activities.',
    icon: User
  },
  {
    name: 'Guest',
    label: 'GUEST',
    color: '#6B7280',
    description: 'Read-only access: can view content they are specifically invited to.',
    icon: Eye
  }
];

export default function RolesPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [roles, setRoles] = useState<ICustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<ICustomRole | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    color: '#3B82F6',
    description: '',
    permissions: [] as string[]
  });

  const { can } = usePermissions();

  useEffect(() => {
    fetchRoles();
  }, [workspaceId]);

  const fetchRoles = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/custom-roles`);
      setRoles(res.data.data);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      label: '',
      color: '#3B82F6',
      description: '',
      permissions: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (role: ICustomRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      label: role.label,
      color: role.color,
      description: role.description || '',
      permissions: role.permissions
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.label) {
      toast.error('Please fill in name and label');
      return;
    }

    try {
      if (editingRole) {
        await api.patch(`/workspaces/${workspaceId}/custom-roles/${editingRole._id}`, formData);
        toast.success('Role updated');
      } else {
        await api.post(`/workspaces/${workspaceId}/custom-roles`, formData);
        toast.success('Role created');
      }
      fetchRoles();
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure? Members with this role will revert to standard Member permissions.')) return;

    try {
      await api.delete(`/workspaces/${workspaceId}/custom-roles/${roleId}`);
      toast.success('Role deleted');
      fetchRoles();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  if (loading) return <TableSkeleton />;

  if (!can('MANAGE_CUSTOM_ROLES')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
        <Shield className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          You do not have permission to manage workspace roles and permissions.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="w-full px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
                <p className="text-sm text-muted-foreground">Manage granular access for your team</p>
              </div>
            </div>
            <Button onClick={handleOpenCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Role
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* System Roles Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">System Roles</h2>
            <Badge variant="secondary" className="ml-2">Built-in</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NATIVE_ROLES.map((role) => (
              <div key={role.name} className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: role.color + '15' }}
                    >
                      <role.icon className="w-5 h-5" style={{ color: role.color }} />
                    </div>
                    <h3 className="font-bold text-card-foreground">{role.name}</h3>
                  </div>
                  <Badge 
                    style={{ backgroundColor: role.color + '15', color: role.color, borderColor: role.color + '30' }}
                    className="border text-[10px] px-1.5 py-0 h-5"
                  >
                    {role.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {role.description}
                </p>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Default Permissions</span>
                  <div className="flex -space-x-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-5 h-5 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Roles Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-bold text-foreground">Custom Workspace Roles</h2>
            </div>
          </div>
          
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Badge Preview</TableHead>
                <TableHead>Permissions Count</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No custom roles created yet.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role._id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{ backgroundColor: role.color + '20', color: role.color, borderColor: role.color + '40' }}
                        className="border"
                      >
                        {role.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.permissions.length} actions</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(role)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(role._id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              Define the name, label, and granular permissions for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Internal Name</Label>
                <Input 
                  placeholder="e.g. Lead Developer" 
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>UI Label (Badge Text)</Label>
                <Input 
                  placeholder="e.g. Lead" 
                  value={formData.label} 
                  onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge Color</Label>
                <div className="flex gap-2 items-center">
                  <Input 
                    type="color" 
                    className="w-12 h-10 p-1"
                    value={formData.color} 
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  />
                  <Input 
                    value={formData.color} 
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="What is this role for?" 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-bold">Permissions Matrix</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.name} className="space-y-3">
                    <h4 className="font-semibold text-primary border-b pb-1">{group.name}</h4>
                    {group.permissions.map(perm => (
                      <div key={perm.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={perm.id} 
                          checked={formData.permissions.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <label htmlFor={perm.id} className="text-sm cursor-pointer hover:text-primary transition-colors">
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
