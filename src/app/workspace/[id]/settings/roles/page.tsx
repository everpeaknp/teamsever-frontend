'use client';

import type { ComponentType, CSSProperties, Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Edit2,
  Eye,
  Layers,
  Loader2,
  Palette,
  Plus,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCog,
  Workflow,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ICustomRole } from '@/types/pro-features';
import { TableSkeleton } from '@/components/skeletons/PageSkeleton';
import { UserAvatar } from '@/components/ui/user-avatar';

interface PermissionCatalogItem {
  key: string;
  label: string;
  category: string;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  role: SystemRoleKey;
  isOwner: boolean;
  customRole?: ICustomRole | null;
}

interface SystemRoleAddition {
  role: SystemRoleKey;
  permissions: string[];
}

interface MemberPermissionOverrides {
  additionalPermissions: string[];
  restrictedPermissions: string[];
}

interface PermissionSourceMeta {
  tone?: 'inherited' | 'added' | 'restricted';
  badge?: string;
  hint?: string;
}

type SystemRoleKey =
  | 'owner'
  | 'admin'
  | 'operations_manager'
  | 'project_manager'
  | 'qa'
  | 'developer'
  | 'member'
  | 'guest';

const DEFAULT_PERMISSION_CATALOG: PermissionCatalogItem[] = [
  { key: 'VIEW_WORKSPACE', label: 'Workspace Home Access', category: 'Workspace Access' },
  { key: 'UPDATE_WORKSPACE', label: 'Edit Workspace Profile', category: 'Workspace Access' },
  { key: 'LEAVE_WORKSPACE', label: 'Leave Workspace', category: 'Workspace Access' },
  { key: 'INVITE_MEMBER', label: 'Invite Members', category: 'Member Admin' },
  { key: 'REMOVE_MEMBER', label: 'Remove Members', category: 'Member Admin' },
  { key: 'CHANGE_MEMBER_ROLE', label: 'Change Member Roles', category: 'Member Admin' },
  { key: 'MANAGE_CUSTOM_ROLES', label: 'Manage Role Templates', category: 'Member Admin' },
  { key: 'CREATE_SPACE', label: 'Create Spaces', category: 'Hierarchy' },
  { key: 'DELETE_SPACE', label: 'Delete Spaces', category: 'Hierarchy' },
  { key: 'UPDATE_SPACE', label: 'Edit Spaces', category: 'Hierarchy' },
  { key: 'VIEW_SPACE', label: 'View Spaces', category: 'Hierarchy' },
  { key: 'ADD_SPACE_MEMBER', label: 'Add Space Members', category: 'Hierarchy' },
  { key: 'REMOVE_SPACE_MEMBER', label: 'Remove Space Members', category: 'Hierarchy' },
  { key: 'MANAGE_SPACE_PERMISSIONS', label: 'Manage Space Permissions', category: 'Hierarchy' },
  { key: 'CREATE_FOLDER', label: 'Create Folders', category: 'Hierarchy' },
  { key: 'DELETE_FOLDER', label: 'Delete Folders', category: 'Hierarchy' },
  { key: 'UPDATE_FOLDER', label: 'Edit Folders', category: 'Hierarchy' },
  { key: 'VIEW_FOLDER', label: 'View Folders', category: 'Hierarchy' },
  { key: 'CREATE_LIST', label: 'Create Lists', category: 'Hierarchy' },
  { key: 'DELETE_LIST', label: 'Delete Lists', category: 'Hierarchy' },
  { key: 'UPDATE_LIST', label: 'Edit Lists', category: 'Hierarchy' },
  { key: 'VIEW_LIST', label: 'View Lists', category: 'Hierarchy' },
  { key: 'CREATE_TASK', label: 'Create Tasks', category: 'Task Execution' },
  { key: 'DELETE_TASK', label: 'Delete Tasks', category: 'Task Execution' },
  { key: 'EDIT_TASK', label: 'Edit Tasks', category: 'Task Execution' },
  { key: 'VIEW_TASK', label: 'View Tasks', category: 'Task Execution' },
  { key: 'ASSIGN_TASK', label: 'Assign Tasks', category: 'Task Execution' },
  { key: 'CHANGE_STATUS', label: 'Change Task Status', category: 'Task Execution' },
  { key: 'MARK_TASK_DONE', label: 'Approve Done Status', category: 'Task Execution' },
  { key: 'COMMENT_TASK', label: 'Comment on Tasks', category: 'Task Collaboration' },
  { key: 'VIEW_ANNOUNCEMENT', label: 'View Announcements', category: 'Announcements' },
  { key: 'CREATE_ANNOUNCEMENT', label: 'Create Announcements', category: 'Announcements' },
  { key: 'DELETE_ANNOUNCEMENT', label: 'Delete Announcements', category: 'Announcements' },
  { key: 'VIEW_ANALYTICS_PERSONAL', label: 'View Personal Analytics', category: 'Analytics' },
  { key: 'VIEW_ANALYTICS_TEAM', label: 'View Workspace Analytics', category: 'Analytics' },
  { key: 'VIEW_ACTIVITY_LOG', label: 'View Activity Log', category: 'Analytics' },
  { key: 'MANAGE_SETTINGS', label: 'Manage Workspace Settings', category: 'Workspace Settings' },
];

const PERMISSION_CATEGORIES = [
  'Workspace Access',
  'Member Admin',
  'Hierarchy',
  'Task Execution',
  'Task Collaboration',
  'Announcements',
  'Analytics',
  'Workspace Settings',
];

const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  VIEW_ANALYTICS: ['VIEW_ANALYTICS_PERSONAL', 'VIEW_ANALYTICS_TEAM'],
};

const BASE_ROLE_PERMISSIONS: Record<SystemRoleKey, string[]> = {
  owner: [
    'UPDATE_WORKSPACE',
    'INVITE_MEMBER',
    'REMOVE_MEMBER',
    'CHANGE_MEMBER_ROLE',
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'CREATE_SPACE',
    'DELETE_SPACE',
    'UPDATE_SPACE',
    'VIEW_SPACE',
    'ADD_SPACE_MEMBER',
    'REMOVE_SPACE_MEMBER',
    'MANAGE_SPACE_PERMISSIONS',
    'CREATE_FOLDER',
    'DELETE_FOLDER',
    'UPDATE_FOLDER',
    'VIEW_FOLDER',
    'CREATE_LIST',
    'DELETE_LIST',
    'UPDATE_LIST',
    'VIEW_LIST',
    'CREATE_TASK',
    'DELETE_TASK',
    'EDIT_TASK',
    'VIEW_TASK',
    'ASSIGN_TASK',
    'CHANGE_STATUS',
    'COMMENT_TASK',
    'MANAGE_SETTINGS',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ANALYTICS_TEAM',
    'VIEW_ANALYTICS',
    'VIEW_ACTIVITY_LOG',
    'MANAGE_CUSTOM_ROLES',
    'VIEW_ANNOUNCEMENT',
  ],
  admin: [
    'UPDATE_WORKSPACE',
    'INVITE_MEMBER',
    'REMOVE_MEMBER',
    'CHANGE_MEMBER_ROLE',
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'CREATE_SPACE',
    'DELETE_SPACE',
    'UPDATE_SPACE',
    'VIEW_SPACE',
    'ADD_SPACE_MEMBER',
    'REMOVE_SPACE_MEMBER',
    'MANAGE_SPACE_PERMISSIONS',
    'CREATE_FOLDER',
    'DELETE_FOLDER',
    'UPDATE_FOLDER',
    'VIEW_FOLDER',
    'CREATE_LIST',
    'DELETE_LIST',
    'UPDATE_LIST',
    'VIEW_LIST',
    'CREATE_TASK',
    'DELETE_TASK',
    'EDIT_TASK',
    'VIEW_TASK',
    'ASSIGN_TASK',
    'CHANGE_STATUS',
    'COMMENT_TASK',
    'MANAGE_SETTINGS',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ANALYTICS_TEAM',
    'VIEW_ANALYTICS',
    'VIEW_ACTIVITY_LOG',
    'MANAGE_CUSTOM_ROLES',
    'VIEW_ANNOUNCEMENT',
    'CREATE_ANNOUNCEMENT',
    'DELETE_ANNOUNCEMENT',
  ],
  operations_manager: [
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'INVITE_MEMBER',
    'REMOVE_MEMBER',
    'CREATE_SPACE',
    'DELETE_SPACE',
    'UPDATE_SPACE',
    'VIEW_SPACE',
    'ADD_SPACE_MEMBER',
    'REMOVE_SPACE_MEMBER',
    'MANAGE_SPACE_PERMISSIONS',
    'CREATE_FOLDER',
    'DELETE_FOLDER',
    'UPDATE_FOLDER',
    'VIEW_FOLDER',
    'CREATE_LIST',
    'DELETE_LIST',
    'UPDATE_LIST',
    'VIEW_LIST',
    'CREATE_TASK',
    'DELETE_TASK',
    'EDIT_TASK',
    'VIEW_TASK',
    'ASSIGN_TASK',
    'CHANGE_STATUS',
    'COMMENT_TASK',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ANALYTICS_TEAM',
    'VIEW_ANALYTICS',
    'VIEW_ACTIVITY_LOG',
    'VIEW_ANNOUNCEMENT',
  ],
  project_manager: [
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'CREATE_SPACE',
    'DELETE_SPACE',
    'UPDATE_SPACE',
    'VIEW_SPACE',
    'ADD_SPACE_MEMBER',
    'REMOVE_SPACE_MEMBER',
    'MANAGE_SPACE_PERMISSIONS',
    'CREATE_FOLDER',
    'DELETE_FOLDER',
    'UPDATE_FOLDER',
    'VIEW_FOLDER',
    'CREATE_LIST',
    'DELETE_LIST',
    'UPDATE_LIST',
    'VIEW_LIST',
    'CREATE_TASK',
    'DELETE_TASK',
    'EDIT_TASK',
    'VIEW_TASK',
    'ASSIGN_TASK',
    'CHANGE_STATUS',
    'COMMENT_TASK',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ACTIVITY_LOG',
    'VIEW_ANNOUNCEMENT',
    'CREATE_ANNOUNCEMENT',
    'DELETE_ANNOUNCEMENT',
  ],
  developer: [
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'VIEW_SPACE',
    'VIEW_FOLDER',
    'VIEW_LIST',
    'VIEW_TASK',
    'EDIT_TASK',
    'ASSIGN_TASK',
    'CHANGE_STATUS',
    'COMMENT_TASK',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ACTIVITY_LOG',
    'VIEW_ANNOUNCEMENT',
  ],
  qa: [
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'VIEW_SPACE',
    'VIEW_FOLDER',
    'VIEW_LIST',
    'CREATE_TASK',
    'EDIT_TASK',
    'VIEW_TASK',
    'CHANGE_STATUS',
    'COMMENT_TASK',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ACTIVITY_LOG',
    'VIEW_ANNOUNCEMENT',
  ],
  member: [
    'VIEW_WORKSPACE',
    'LEAVE_WORKSPACE',
    'VIEW_SPACE',
    'VIEW_FOLDER',
    'VIEW_LIST',
    'VIEW_TASK',
    'COMMENT_TASK',
    'VIEW_ANALYTICS_PERSONAL',
    'VIEW_ACTIVITY_LOG',
    'VIEW_ANNOUNCEMENT',
  ],
  guest: ['VIEW_WORKSPACE', 'VIEW_SPACE', 'VIEW_FOLDER', 'VIEW_LIST', 'VIEW_TASK', 'COMMENT_TASK', 'VIEW_ANNOUNCEMENT'],
};

const NATIVE_ROLES: Array<{
  key: SystemRoleKey;
  name: string;
  label: string;
  color: string;
  description: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
}> = [
  {
    key: 'owner',
    name: 'Owner',
    label: 'OWNER',
    color: '#DC2626',
    description: 'Full bypass for everything in the workspace. This role is fixed and does not need additive tuning.',
    icon: Crown,
  },
  {
    key: 'admin',
    name: 'Admin',
    label: 'ADMIN',
    color: '#2563EB',
    description: 'Workspace-wide management with broad access across structure, members, announcements, and analytics.',
    icon: ShieldCheck,
  },
  {
    key: 'operations_manager',
    name: 'Operations Manager',
    label: 'OPS',
    color: '#EA580C',
    description: 'Operational oversight role. Use additive permissions here when one workspace needs extra authority.',
    icon: Workflow,
  },
  {
    key: 'project_manager',
    name: 'Project Manager',
    label: 'PM',
    color: '#9333EA',
    description: 'Delivery-focused role with strong task and structure control, but still workspace-scoped.',
    icon: Layers,
  },
  {
    key: 'developer',
    name: 'Developer',
    label: 'DEV',
    color: '#059669',
    description: 'Build-and-ship role focused on task execution, status movement, and daily collaboration.',
    icon: Code2,
  },
  {
    key: 'qa',
    name: 'QA',
    label: 'QA',
    color: '#D97706',
    description: 'Verification role for reporting, testing, and moving work through quality gates.',
    icon: CheckCircle2,
  },
  {
    key: 'member',
    name: 'Member',
    label: 'MEMBER',
    color: '#0F766E',
    description: 'Standard team member access for routine collaboration and assigned work.',
    icon: User,
  },
  {
    key: 'guest',
    name: 'Guest',
    label: 'GUEST',
    color: '#6B7280',
    description: 'Minimal workspace visibility for external or limited-access users.',
    icon: Eye,
  },
];

function prettifyRole(role: string) {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPermissionLabel(permissionCatalog: PermissionCatalogItem[], permissionKey: string) {
  return permissionCatalog.find((permission) => permission.key === permissionKey)?.label || permissionKey;
}

function PermissionBreakdown({
  title,
  description,
  groupedPermissions,
  activePermissions,
}: {
  title: string;
  description: string;
  groupedPermissions: { category: string; permissions: PermissionCatalogItem[] }[];
  activePermissions: Set<string>;
}) {
  const visibleGroups = groupedPermissions
    .map((group) => ({
      category: group.category,
      permissions: group.permissions.filter((permission) => activePermissions.has(permission.key)),
    }))
    .filter((group) => group.permissions.length > 0);

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div>
        <div className="text-base font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">{group.category}</div>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                {group.permissions.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.permissions.map((permission) => (
                <Badge key={permission.key} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {permission.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionPicker({
  groupedPermissions,
  selectedPermissions,
  restrictedPermissions = [],
  togglePermission,
  isPermissionSelected,
  permissionSearch,
  setPermissionSearch,
  lockedPermissions = new Set<string>(),
  allowRestrictInherited = false,
  toggleRestrictedPermission,
  getPermissionMeta,
  title,
  description,
}: {
  groupedPermissions: { category: string; permissions: PermissionCatalogItem[] }[];
  selectedPermissions: string[];
  restrictedPermissions?: string[];
  togglePermission: (permId: string) => void;
  isPermissionSelected: (permId: string) => boolean;
  permissionSearch: string;
  setPermissionSearch: (value: string) => void;
  lockedPermissions?: Set<string>;
  allowRestrictInherited?: boolean;
  toggleRestrictedPermission?: (permId: string) => void;
  getPermissionMeta?: (permId: string, state: { checked: boolean; locked: boolean; restricted: boolean }) => PermissionSourceMeta | null;
  title: string;
  description: string;
}) {
  const filteredGroups = groupedPermissions
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((perm) => {
        const haystack = `${perm.label} ${perm.key} ${perm.category}`.toLowerCase();
        return haystack.includes(permissionSearch.toLowerCase());
      }),
    }))
    .filter((group) => group.permissions.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-base font-semibold text-foreground">{title}</div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {allowRestrictInherited
                ? `${selectedPermissions.length} added${restrictedPermissions.length ? ` • ${restrictedPermissions.length} removed` : ''}`
                : `${selectedPermissions.length} selected`}
            </Badge>
            <div className="relative w-full lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                placeholder="Search permissions"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredGroups.map((group) => (
          <div key={group.category} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-semibold text-foreground">{group.category}</h4>
              <Badge variant="outline" className="rounded-full text-[11px] uppercase tracking-wide">
                {group.permissions.length} actions
              </Badge>
            </div>

            <div className="space-y-2">
              {group.permissions.map((perm) => {
                const checked = isPermissionSelected(perm.key);
                const locked = lockedPermissions.has(perm.key);
                const restricted = restrictedPermissions.includes(perm.key);
                const inheritedActive = locked && !restricted;
                const meta = getPermissionMeta?.(perm.key, { checked, locked, restricted });
                return (
                  <label
                    key={perm.key}
                    htmlFor={perm.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      locked && !allowRestrictInherited
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'
                        : inheritedActive
                          ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'
                          : locked && restricted
                            ? 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20'
                        : checked
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      id={perm.key}
                      checked={locked ? !restricted : checked}
                      disabled={locked && !allowRestrictInherited}
                      onCheckedChange={() => {
                        if (locked && allowRestrictInherited && toggleRestrictedPermission) {
                          toggleRestrictedPermission(perm.key);
                          return;
                        }
                        if (!locked) togglePermission(perm.key);
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{perm.label}</span>
                        {meta?.badge ? (
                          <Badge
                            variant="outline"
                            className={`rounded-full text-[10px] uppercase tracking-wide ${
                              meta.tone === 'restricted'
                                ? 'border-rose-300 text-rose-600 dark:border-rose-900 dark:text-rose-300'
                                : meta.tone === 'added'
                                  ? 'border-sky-300 text-sky-600 dark:border-sky-900 dark:text-sky-300'
                                  : ''
                            }`}
                          >
                            {meta.badge}
                          </Badge>
                        ) : locked ? (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                            {restricted ? 'restricted here' : 'inherited'}
                          </Badge>
                        ) : checked ? (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                            added here
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{perm.key}</div>
                      {meta?.hint ? <div className="mt-1 text-xs text-muted-foreground">{meta.hint}</div> : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RolesPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { can } = usePermissions();

  const [roles, setRoles] = useState<ICustomRole[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>(DEFAULT_PERMISSION_CATALOG);
  const [systemRoleAdditions, setSystemRoleAdditions] = useState<Record<string, string[]>>({});
  const [memberPermissionMap, setMemberPermissionMap] = useState<Record<string, MemberPermissionOverrides>>({});
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSystemRoleModal, setShowSystemRoleModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingRole, setEditingRole] = useState<ICustomRole | null>(null);
  const [selectedSystemRole, setSelectedSystemRole] = useState<SystemRoleKey>('operations_manager');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const [savingRole, setSavingRole] = useState(false);
  const [savingSystemRole, setSavingSystemRole] = useState(false);
  const [savingMemberPermissions, setSavingMemberPermissions] = useState(false);
  const [loadingMemberPermissions, setLoadingMemberPermissions] = useState(false);

  const [rolePermissionSearch, setRolePermissionSearch] = useState('');
  const [systemPermissionSearch, setSystemPermissionSearch] = useState('');
  const [memberPermissionSearch, setMemberPermissionSearch] = useState('');

  const [roleForm, setRoleForm] = useState({
    name: '',
    label: '',
    color: '#2563EB',
    description: '',
    permissions: [] as string[],
  });
  const [systemRolePermissions, setSystemRolePermissions] = useState<string[]>([]);
  const [memberAdditionalPermissions, setMemberAdditionalPermissions] = useState<string[]>([]);
  const [memberRestrictedPermissions, setMemberRestrictedPermissions] = useState<string[]>([]);

  const loadPageData = useCallback(async () => {
    try {
      const [rolesRes, catalogRes, systemRoleRes, membersRes] = await Promise.allSettled([
        api.get(`/workspaces/${workspaceId}/custom-roles`),
        api.get(`/workspaces/${workspaceId}/custom-roles/permission-catalog`),
        api.get(`/workspaces/${workspaceId}/system-roles/permission-additions`),
        api.get(`/workspaces/${workspaceId}/members`),
      ]);

      if (rolesRes.status === 'fulfilled') {
        setRoles(rolesRes.value.data?.data || []);
      } else {
        toast.error('Failed to load custom roles');
      }

      if (catalogRes.status === 'fulfilled') {
        setPermissionCatalog(catalogRes.value.data?.data || DEFAULT_PERMISSION_CATALOG);
      } else {
        setPermissionCatalog(DEFAULT_PERMISSION_CATALOG);
      }

      if (systemRoleRes.status === 'fulfilled') {
        const list = (systemRoleRes.value.data?.data || []) as SystemRoleAddition[];
        const mapped = list.reduce<Record<string, string[]>>((acc, entry) => {
          acc[entry.role] = entry.permissions || [];
          return acc;
        }, {});
        setSystemRoleAdditions(mapped);
      } else {
        setSystemRoleAdditions({});
      }

      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value.data?.data || []);
      } else {
        toast.error('Failed to load members');
      }
    } finally {
      setLoading(false);
      setCatalogLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PermissionCatalogItem[]>();
    for (const permission of permissionCatalog) {
      const category = permission.category || 'Other';
      const bucket = groups.get(category) || [];
      if (!bucket.some((item) => item.key === permission.key)) {
        bucket.push(permission);
      }
      groups.set(category, bucket);
    }

    const orderedCategories = [
      ...PERMISSION_CATEGORIES,
      ...Array.from(groups.keys()).filter((category) => !PERMISSION_CATEGORIES.includes(category)),
    ];

    return orderedCategories
      .filter((category, index, all) => all.indexOf(category) === index && groups.has(category))
      .map((category) => ({
        category,
        permissions: (groups.get(category) || []).sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [permissionCatalog]);
  const allPermissionKeys = useMemo(() => permissionCatalog.map((permission) => permission.key), [permissionCatalog]);
  const permissionLabelMap = useMemo(
    () =>
      permissionCatalog.reduce<Record<string, string>>((acc, permission) => {
        acc[permission.key] = permission.label;
        return acc;
      }, {}),
    [permissionCatalog]
  );

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRolePermissionSearch('');
    setRoleForm({
      name: '',
      label: '',
      color: '#2563EB',
      description: '',
      permissions: [],
    });
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role: ICustomRole) => {
    setEditingRole(role);
    setRolePermissionSearch('');
    setRoleForm({
      name: role.name,
      label: role.label,
      color: role.color,
      description: role.description || '',
      permissions: [...(role.permissions || [])],
    });
    setShowRoleModal(true);
  };

  const openSystemRoleModal = (roleKey: SystemRoleKey) => {
    setSelectedSystemRole(roleKey);
    setSystemPermissionSearch('');
    setSystemRolePermissions([...(systemRoleAdditions[roleKey] || [])]);
    setShowSystemRoleModal(true);
  };

  const loadMemberPermissionAdditions = useCallback(async (memberId: string, forceRefresh = false) => {
    if (!memberId) {
      setMemberAdditionalPermissions([]);
      setMemberRestrictedPermissions([]);
      return;
    }

    if (!forceRefresh && Object.prototype.hasOwnProperty.call(memberPermissionMap, memberId)) {
      setMemberAdditionalPermissions(memberPermissionMap[memberId].additionalPermissions || []);
      setMemberRestrictedPermissions(memberPermissionMap[memberId].restrictedPermissions || []);
      return;
    }

    setLoadingMemberPermissions(true);
    try {
      const res = await api.get(`/workspaces/${workspaceId}/members/${memberId}/permission-additions`);
      const overrides = res.data?.data || { additionalPermissions: [], restrictedPermissions: [] };
      setMemberAdditionalPermissions(overrides.additionalPermissions || []);
      setMemberRestrictedPermissions(overrides.restrictedPermissions || []);
      setMemberPermissionMap((prev) => ({ ...prev, [memberId]: overrides }));
    } catch {
      toast.error('Failed to load member overrides');
      setMemberAdditionalPermissions([]);
      setMemberRestrictedPermissions([]);
    } finally {
      setLoadingMemberPermissions(false);
    }
  }, [memberPermissionMap, workspaceId]);

  const openMemberModal = async (memberId?: string) => {
    const fallbackMemberId = memberId || members.find((member) => !member.isOwner)?._id || '';
    setSelectedMemberId(fallbackMemberId);
    setMemberPermissionSearch('');
    setShowMemberModal(true);
    await loadMemberPermissionAdditions(fallbackMemberId);
  };

  const isPermissionSelected = useCallback((permId: string, selectedPermissions: string[]) => {
    if (selectedPermissions.includes(permId)) return true;
    const aliases = LEGACY_PERMISSION_ALIASES[permId];
    return aliases ? aliases.some((alias) => selectedPermissions.includes(alias)) : false;
  }, []);

  const togglePermissions = (
    selectedPermissions: string[],
    setSelectedPermissions: Dispatch<SetStateAction<string[]>>,
    permId: string,
  ) => {
    setSelectedPermissions((prev) => {
      const current = new Set(prev);
      const isSelected = current.has(permId);

      if (permId === 'VIEW_ANALYTICS_PERSONAL') {
        if (current.has('VIEW_ANALYTICS_TEAM')) current.delete('VIEW_ANALYTICS_TEAM');
        if (isSelected) current.delete(permId);
        else current.add(permId);
      } else if (permId === 'VIEW_ANALYTICS_TEAM') {
        if (isSelected) current.delete(permId);
        else {
          current.add('VIEW_ANALYTICS_PERSONAL');
          current.add(permId);
        }
      } else if (isSelected) {
        current.delete(permId);
      } else {
        current.add(permId);
      }

      return Array.from(current);
    });
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim() || !roleForm.label.trim()) {
      toast.error('Role name and label are required');
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole) {
        await api.patch(`/workspaces/${workspaceId}/custom-roles/${editingRole._id}`, roleForm);
        toast.success('Role updated');
      } else {
        await api.post(`/workspaces/${workspaceId}/custom-roles`, roleForm);
        toast.success('Role created');
      }
      await loadPageData();
      setShowRoleModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this custom role? Members using it will lose that custom template.')) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/custom-roles/${roleId}`);
      toast.success('Role deleted');
      await loadPageData();
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const handleSaveSystemRole = async () => {
    setSavingSystemRole(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/system-roles/permission-additions`, {
        role: selectedSystemRole,
        permissions: systemRolePermissions,
      });
      setSystemRoleAdditions((prev) => ({ ...prev, [selectedSystemRole]: systemRolePermissions }));
      toast.success('System role additions updated');
      setShowSystemRoleModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update system role additions');
    } finally {
      setSavingSystemRole(false);
    }
  };

  const handleResetSystemRolePermissions = async () => {
    if (selectedSystemRole === 'owner') return;
    setSavingSystemRole(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/system-roles/permission-additions`, {
        role: selectedSystemRole,
        permissions: [],
      });
      setSystemRolePermissions([]);
      setSystemRoleAdditions((prev) => ({ ...prev, [selectedSystemRole]: [] }));
      toast.success('System role additions reset');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset system role additions');
    } finally {
      setSavingSystemRole(false);
    }
  };

  const handleSaveMemberPermissions = async () => {
    if (!selectedMemberId) return;
    setSavingMemberPermissions(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${selectedMemberId}/permission-additions`, {
        additionalPermissions: memberAdditionalPermissions,
        restrictedPermissions: memberRestrictedPermissions,
      });
      setMemberPermissionMap((prev) => ({
        ...prev,
        [selectedMemberId]: {
          additionalPermissions: memberAdditionalPermissions,
          restrictedPermissions: memberRestrictedPermissions,
        }
      }));
      await loadMemberPermissionAdditions(selectedMemberId, true);
      toast.success('Member permission overrides updated');
      setShowMemberModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update member permissions');
    } finally {
      setSavingMemberPermissions(false);
    }
  };

  const handleResetMemberPermissions = async () => {
    if (!selectedMemberId) return;
    setSavingMemberPermissions(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${selectedMemberId}/permission-additions`, {
        additionalPermissions: [],
        restrictedPermissions: [],
      });
      setMemberAdditionalPermissions([]);
      setMemberRestrictedPermissions([]);
      setMemberPermissionMap((prev) => ({
        ...prev,
        [selectedMemberId]: { additionalPermissions: [], restrictedPermissions: [] }
      }));
      await loadMemberPermissionAdditions(selectedMemberId, true);
      toast.success('Member overrides reset');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset member additions');
    } finally {
      setSavingMemberPermissions(false);
    }
  };

  const selectedSystemRoleMeta = NATIVE_ROLES.find((role) => role.key === selectedSystemRole) || NATIVE_ROLES[0];
  const baseSystemRolePermissions = useMemo(
    () => new Set(selectedSystemRole === 'owner' ? allPermissionKeys : BASE_ROLE_PERMISSIONS[selectedSystemRole] || []),
    [allPermissionKeys, selectedSystemRole]
  );
  const selectedSystemEffectivePermissions = useMemo(
    () => new Set([...Array.from(baseSystemRolePermissions), ...systemRolePermissions]),
    [baseSystemRolePermissions, systemRolePermissions]
  );
  const selectedMember = members.find((member) => member._id === selectedMemberId);
  const selectedMemberBasePermissions = useMemo(() => {
    if (!selectedMember) return new Set<string>();
    if (selectedMember.role === 'owner') return new Set(allPermissionKeys);
    const roleBase = BASE_ROLE_PERMISSIONS[selectedMember.role] || [];
    const roleBoosts = systemRoleAdditions[selectedMember.role] || [];
    const customRolePermissions =
      selectedMember.customRole && typeof selectedMember.customRole === 'object'
        ? selectedMember.customRole.permissions || []
        : [];
    return new Set([...roleBase, ...roleBoosts, ...customRolePermissions]);
  }, [allPermissionKeys, selectedMember, systemRoleAdditions]);
  const selectedMemberEffectivePermissions = useMemo(
    () => new Set(
      [...Array.from(selectedMemberBasePermissions), ...memberAdditionalPermissions]
        .filter((permission) => !memberRestrictedPermissions.includes(permission))
    ),
    [memberAdditionalPermissions, memberRestrictedPermissions, selectedMemberBasePermissions]
  );
  const selectedMemberCustomRolePermissions = useMemo(() => {
    if (!selectedMember?.customRole || typeof selectedMember.customRole !== 'object') return new Set<string>();
    return new Set(selectedMember.customRole.permissions || []);
  }, [selectedMember]);
  const selectedMemberRoleBasePermissions = useMemo(() => {
    if (!selectedMember) return new Set<string>();
    if (selectedMember.role === 'owner') return new Set(allPermissionKeys);
    return new Set(BASE_ROLE_PERMISSIONS[selectedMember.role] || []);
  }, [allPermissionKeys, selectedMember]);
  const selectedMemberRoleAdditions = useMemo(() => {
    if (!selectedMember) return new Set<string>();
    return new Set(systemRoleAdditions[selectedMember.role] || []);
  }, [selectedMember, systemRoleAdditions]);

  const getSystemRolePermissionMeta = useCallback(
    (permId: string, state: { checked: boolean; locked: boolean; restricted: boolean }): PermissionSourceMeta | null => {
      if (state.locked) {
        return {
          tone: 'inherited',
          badge: 'inherited',
          hint: selectedSystemRole === 'owner' ? 'Inherited from owner full-access bypass.' : 'Inherited from the built-in system role.',
        };
      }
      if (state.checked) {
        return {
          tone: 'added',
          badge: 'added here',
          hint: 'Added on top of the built-in role for this workspace only.',
        };
      }
      return null;
    },
    [selectedSystemRole]
  );

  const getMemberPermissionMeta = useCallback(
    (permId: string, state: { checked: boolean; locked: boolean; restricted: boolean }): PermissionSourceMeta | null => {
      const inheritedSources: string[] = [];

      if (selectedMember?.role === 'owner') {
        inheritedSources.push('owner bypass');
      } else {
        if (selectedMemberRoleBasePermissions.has(permId)) inheritedSources.push('built-in role');
        if (selectedMemberRoleAdditions.has(permId)) inheritedSources.push('workspace role addition');
        if (selectedMemberCustomRolePermissions.has(permId)) inheritedSources.push('custom role');
      }

      if (state.locked) {
        return {
          tone: state.restricted ? 'restricted' : 'inherited',
          badge: state.restricted ? 'restricted here' : 'inherited',
          hint: state.restricted
            ? `Inherited from ${inheritedSources.join(', ') || 'an earlier layer'}, but turned off for this member in this workspace.`
            : `Inherited from ${inheritedSources.join(', ') || 'an earlier layer'}.`,
        };
      }

      if (state.checked) {
        return {
          tone: 'added',
          badge: 'added here',
          hint: 'Added only for this member in this workspace.',
        };
      }

      return null;
    },
    [selectedMember, selectedMemberCustomRolePermissions, selectedMemberRoleAdditions, selectedMemberRoleBasePermissions]
  );

  const setRolePermissions: Dispatch<SetStateAction<string[]>> = useCallback((value) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: typeof value === 'function' ? value(prev.permissions) : value,
    }));
  }, []);

  if (loading) return <TableSkeleton />;

  if (!can('MANAGE_CUSTOM_ROLES')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="max-w-sm text-muted-foreground">
          You do not have permission to manage workspace roles and overrides.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="w-full px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => router.back()}
                className="rounded-xl border border-border bg-background p-2.5 transition-colors hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                    Permission Studio
                  </Badge>
                  <Badge className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-600 hover:bg-sky-500/10 dark:text-sky-300">
                    Workspace Scoped
                  </Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Roles & Permissions</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Tune custom roles, append extra privileges to built-in roles for this workspace, and give member-specific boosts when one person needs more than the rest.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" onClick={() => openMemberModal()}>
                <UserCog className="h-4 w-4" />
                Member Override
              </Button>
              <Button className="gap-2" onClick={openCreateRoleModal}>
                <Plus className="h-4 w-4" />
                Create Role
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-sky-600" />
              <div className="font-semibold text-foreground">System Role Additions</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Add extra permissions to a built-in role for this workspace only.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-orange-600" />
              <div className="font-semibold text-foreground">Member-Specific Additions</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Give one person extra capabilities without changing everyone else on the same system role.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <div className="font-semibold text-foreground">Custom Role Templates</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Create reusable permission bundles and assign them where role templates make more sense than overrides.
            </p>
          </div>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-transparent p-0 md:grid-cols-3">
            <TabsTrigger value="system" className="rounded-2xl border border-border bg-card py-3 data-[state=active]:border-sky-500/40 data-[state=active]:bg-sky-500/10">
              System Roles
            </TabsTrigger>
            <TabsTrigger value="members" className="rounded-2xl border border-border bg-card py-3 data-[state=active]:border-orange-500/40 data-[state=active]:bg-orange-500/10">
              Member Overrides
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-2xl border border-border bg-card py-3 data-[state=active]:border-emerald-500/40 data-[state=active]:bg-emerald-500/10">
              Custom Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-sky-600" />
                <h2 className="text-xl font-semibold text-foreground">Built-in System Roles</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {NATIVE_ROLES.map((role) => {
                  const extraPermissions = systemRoleAdditions[role.key] || [];
                  return (
                    <div key={role.key} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl p-3" style={{ backgroundColor: `${role.color}15` }}>
                            <role.icon className="h-5 w-5" style={{ color: role.color }} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{role.name}</div>
                            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{role.key}</div>
                          </div>
                        </div>
                        <Badge
                          className="rounded-full border px-2.5 py-1 text-[10px]"
                          style={{ backgroundColor: `${role.color}12`, color: role.color, borderColor: `${role.color}30` }}
                        >
                          {role.label}
                        </Badge>
                      </div>

                      <p className="min-h-[72px] text-sm leading-6 text-muted-foreground">{role.description}</p>

                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace additions</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{role.key === 'owner' ? 0 : extraPermissions.length}</div>
                        </div>
                        {role.key === 'owner' ? (
                          <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Full access</Badge>
                        ) : (
                          <Button variant="outline" className="rounded-xl" onClick={() => openSystemRoleModal(role.key)}>
                            Tune Role
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Member-Specific Permission Boosts</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use this when two people share a built-in role but one of them needs extra power only in this workspace.
                  </p>
                </div>
                <Button className="gap-2" onClick={() => openMemberModal()}>
                  <Plus className="h-4 w-4" />
                  Configure Member
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {members
                  .filter((member) => !member.isOwner)
                  .map((member) => {
                    const overrides = memberPermissionMap[member._id] || { additionalPermissions: [], restrictedPermissions: [] };
                    return (
                      <div key={member._id} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={{
                              _id: member._id,
                              name: member.name,
                              email: member.email,
                              avatar: member.avatar,
                              profilePicture: member.profilePicture,
                            }}
                            className="h-10 w-10"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{member.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <Badge variant="outline" className="rounded-full px-2.5 py-1">
                            {prettifyRole(member.role)}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Badge className="rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 dark:text-orange-300">
                              {overrides.additionalPermissions.length} added
                            </Badge>
                            <Badge className="rounded-full bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300">
                              {overrides.restrictedPermissions.length} removed
                            </Badge>
                          </div>
                        </div>

                        <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => openMemberModal(member._id)}>
                          Edit Member Permissions
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-semibold text-foreground">Custom Workspace Roles</h2>
                </div>
                <Button className="gap-2" onClick={openCreateRoleModal}>
                  <Plus className="h-4 w-4" />
                  New Custom Role
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Badge Preview</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                          No custom roles created yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => (
                        <TableRow key={role._id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: `${role.color}20`,
                                color: role.color,
                                borderColor: `${role.color}40`,
                              }}
                              className="rounded-full border"
                            >
                              {role.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{role.permissions.length} actions</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {role.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditRoleModal(role)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRole(role._id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-3xl p-0">
          <DialogHeader className="border-b border-border bg-card px-6 py-5">
            <DialogTitle className="text-2xl font-semibold">
              {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-sm">
              Build a cleaner role template with a strong badge identity, a short purpose statement, and only the exact permissions that should travel together.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Role Identity</div>
                    <p className="text-xs text-muted-foreground">Name it like an internal control surface, not a vague job title.</p>
                  </div>
                  <div className="rounded-2xl p-2" style={{ backgroundColor: `${roleForm.color}15` }}>
                    <Palette className="h-4 w-4" style={{ color: roleForm.color }} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Internal Name</Label>
                    <Input
                      placeholder="Lead Developer"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UI Label</Label>
                    <Input
                      placeholder="LEAD"
                      value={roleForm.label}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Badge Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="h-11 w-14 rounded-xl p-1"
                        value={roleForm.color}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, color: e.target.value }))}
                      />
                      <Input
                        value={roleForm.color}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, color: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What does this role actually govern?"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="min-h-[112px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Badge Preview</div>
                  <Badge
                    className="rounded-full border px-3 py-1"
                    style={{ backgroundColor: `${roleForm.color}20`, color: roleForm.color, borderColor: `${roleForm.color}45` }}
                  >
                    {roleForm.label || 'LABEL'}
                  </Badge>
                </div>
                <div className="text-2xl font-semibold text-foreground">{roleForm.name || 'Untitled Role'}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {roleForm.description || 'Add a short description so people understand the difference between this role and a workspace override.'}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-muted/30 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Selected</div>
                    <div className="mt-2 text-2xl font-semibold text-foreground">{roleForm.permissions.length}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Scope</div>
                    <div className="mt-2 text-sm font-medium text-foreground">Template for assignment</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <PermissionPicker
                groupedPermissions={groupedPermissions}
                selectedPermissions={roleForm.permissions}
                togglePermission={(permId) => togglePermissions(roleForm.permissions, setRolePermissions, permId)}
                isPermissionSelected={(permId) => isPermissionSelected(permId, roleForm.permissions)}
                permissionSearch={rolePermissionSearch}
                setPermissionSearch={setRolePermissionSearch}
                title="Permission Builder"
                description="This template should be coherent. If permissions feel random, use member or system overrides instead."
              />

              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {catalogLoading
                  ? 'Loading permission definitions from backend...'
                  : 'Workspace analytics automatically implies personal analytics. Use custom roles for reusable bundles, not one-off exceptions.'}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole} className="gap-2">
              {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSystemRoleModal} onOpenChange={setShowSystemRoleModal}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-3xl p-0">
          <DialogHeader className="border-b border-border bg-card px-6 py-5">
            <DialogTitle className="text-2xl font-semibold">
              {selectedSystemRole === 'owner' ? 'Owner Access Reference' : `Tune ${selectedSystemRoleMeta.name} for This Workspace`}
            </DialogTitle>
            <DialogDescription className="max-w-3xl">
              {selectedSystemRole === 'owner'
                ? 'Owner is not a tunable role here. This panel shows the full inherited owner access surface in detail.'
                : `Base permissions stay intact. Everything you select here is appended only for the \`${selectedSystemRole}\` role in this workspace.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl p-3" style={{ backgroundColor: `${selectedSystemRoleMeta.color}15` }}>
                    <selectedSystemRoleMeta.icon className="h-5 w-5" style={{ color: selectedSystemRoleMeta.color }} />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{selectedSystemRoleMeta.name}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{selectedSystemRoleMeta.key}</div>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{selectedSystemRoleMeta.description}</p>

                <div className="mt-5 space-y-3 rounded-2xl bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {selectedSystemRole === 'owner' ? 'Effective inherited permissions' : 'Base permissions'}
                  </div>
                  <div className="text-2xl font-semibold text-foreground">{baseSystemRolePermissions.size}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSystemRole === 'owner'
                      ? 'Because owner has full bypass access, every permission in this catalog is already inherited.'
                      : 'Already granted permissions are shown as inherited and cannot be unchecked here.'}
                  </div>
                </div>
                <div className="mt-4 space-y-3 rounded-2xl bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace-specific additions</div>
                  <div className="text-2xl font-semibold text-foreground">{selectedSystemRole === 'owner' ? 0 : systemRolePermissions.length}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSystemRole === 'owner'
                      ? 'Owner cannot receive extra additions because the role already resolves to full access.'
                      : 'These are the extra permissions added on top of the built-in role for this workspace only.'}
                  </div>
                  {selectedSystemRole === 'owner' || systemRolePermissions.length === 0 ? null : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {systemRolePermissions.map((permissionKey) => (
                        <Badge key={permissionKey} variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
                          {permissionLabelMap[permissionKey] || permissionKey}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <PermissionPicker
                groupedPermissions={groupedPermissions}
                selectedPermissions={systemRolePermissions}
                togglePermission={(permId) => togglePermissions(systemRolePermissions, setSystemRolePermissions, permId)}
                isPermissionSelected={(permId) => isPermissionSelected(permId, systemRolePermissions)}
                permissionSearch={systemPermissionSearch}
                setPermissionSearch={setSystemPermissionSearch}
                lockedPermissions={baseSystemRolePermissions}
                getPermissionMeta={getSystemRolePermissionMeta}
                title={selectedSystemRole === 'owner' ? 'Full Owner Access' : 'Workspace Additions'}
                description={
                  selectedSystemRole === 'owner'
                    ? 'Every permission shown below is already inherited by owner. This panel is informational.'
                    : 'Append only what this role lacks. If just one person needs more, use the member override panel instead.'
                }
              />
            </div>

            <PermissionBreakdown
              title="Effective Permission Set"
              description="This is the final permission set a user on this system role gets in this workspace after the role and workspace-level additions are combined."
              groupedPermissions={groupedPermissions}
              activePermissions={selectedSystemEffectivePermissions}
            />
          </div>

          <DialogFooter className="border-t border-border bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setShowSystemRoleModal(false)}>
              Close
            </Button>
            {selectedSystemRole === 'owner' ? null : (
              <Button
                variant="outline"
                onClick={handleResetSystemRolePermissions}
                disabled={savingSystemRole || systemRolePermissions.length === 0}
                className="text-destructive hover:bg-destructive/10"
              >
                Reset Additions
              </Button>
            )}
            {selectedSystemRole === 'owner' ? null : (
              <Button onClick={handleSaveSystemRole} disabled={savingSystemRole} className="gap-2">
                {savingSystemRole ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Additions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-3xl p-0">
          <DialogHeader className="border-b border-border bg-card px-6 py-5">
            <DialogTitle className="text-2xl font-semibold">Member-Specific Permission Overrides</DialogTitle>
            <DialogDescription className="max-w-3xl">
              Keep the user on their built-in role, then add missing permissions or switch off inherited ones for this workspace only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="space-y-2">
                    <Label>Select Member</Label>
                    <Select
                      value={selectedMemberId}
                      onValueChange={(value) => {
                        setSelectedMemberId(value);
                        void loadMemberPermissionAdditions(value);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Choose a member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members
                          .filter((member) => !member.isOwner)
                          .map((member) => (
                            <SelectItem key={member._id} value={member._id}>
                              {member.name} · {prettifyRole(member.role)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMember ? (
                    <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={{
                            _id: selectedMember._id,
                            name: selectedMember.name,
                            email: selectedMember.email,
                            avatar: selectedMember.avatar,
                            profilePicture: selectedMember.profilePicture,
                          }}
                          className="h-11 w-11"
                        />
                        <div>
                          <div className="font-medium text-foreground">{selectedMember.name}</div>
                          <div className="text-xs text-muted-foreground">{selectedMember.email}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {prettifyRole(selectedMember.role)}
                        </Badge>
                        {selectedMember.customRole ? (
                          <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300">
                            custom role attached
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-2xl bg-background p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Currently inherited</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground">{selectedMemberBasePermissions.size}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-background p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Added here</div>
                          <div className="mt-2 text-2xl font-semibold text-foreground">{memberAdditionalPermissions.length}</div>
                        </div>
                        <div className="rounded-2xl bg-background p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Restricted here</div>
                          <div className="mt-2 text-2xl font-semibold text-foreground">{memberRestrictedPermissions.length}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Use this for one-off exceptions like “Operations Manager 1 can publish announcements” or “Operations Manager 2 should not be able to remove members in this workspace.”
                </div>
              </div>

              {loadingMemberPermissions ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-border bg-card">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PermissionPicker
                  groupedPermissions={groupedPermissions}
                  selectedPermissions={memberAdditionalPermissions}
                  togglePermission={(permId) => togglePermissions(memberAdditionalPermissions, setMemberAdditionalPermissions, permId)}
                  isPermissionSelected={(permId) => isPermissionSelected(permId, memberAdditionalPermissions)}
                  permissionSearch={memberPermissionSearch}
                  setPermissionSearch={setMemberPermissionSearch}
                  lockedPermissions={selectedMemberBasePermissions}
                  restrictedPermissions={memberRestrictedPermissions}
                  allowRestrictInherited
                  toggleRestrictedPermission={(permId) => togglePermissions(memberRestrictedPermissions, setMemberRestrictedPermissions, permId)}
                  getPermissionMeta={getMemberPermissionMeta}
                  title="Member Overrides"
                  description="Inherited permissions can be turned off for this one member. Uninherited permissions can be added on top."
                />
              )}
            </div>

            {selectedMember ? (
              <PermissionBreakdown
                title="Effective Permission Set"
                description="This final set combines the built-in role base, workspace role additions, any assigned custom role template, member-specific additions, and member-specific restrictions."
                groupedPermissions={groupedPermissions}
                activePermissions={selectedMemberEffectivePermissions}
              />
            ) : null}
          </div>

          <DialogFooter className="border-t border-border bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setShowMemberModal(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleResetMemberPermissions}
              disabled={!selectedMemberId || savingMemberPermissions || (memberAdditionalPermissions.length === 0 && memberRestrictedPermissions.length === 0)}
              className="text-destructive hover:bg-destructive/10"
            >
              Reset Overrides
            </Button>
            <Button onClick={handleSaveMemberPermissions} disabled={!selectedMemberId || savingMemberPermissions} className="gap-2">
              {savingMemberPermissions ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Member Overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
