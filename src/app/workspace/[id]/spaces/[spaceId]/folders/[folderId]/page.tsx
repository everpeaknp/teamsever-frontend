'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { Workspace } from '@/types';
import {
  ArrowLeft,
  Folder,
  Plus,
  MoreVertical,
  Trash2,
  Users,
  CheckCircle2,
  Activity,
  Clock3,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermission, SpacePermissionLevel } from '@/hooks/usePermission';
import { FolderMemberManagement } from '@/components/FolderMemberManagement';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { toast } from 'sonner';

export default function FolderHomePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const spaceId = params.spaceId as string;
  const folderId = params.folderId as string;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const { setWorkspaceContext } = useAuthStore();
  const { currentSpace, folders, loading, fetchSpace, fetchFolders, deleteList } = useSpaceStore();
  const { deleteList: deleteListFromWorkspace } = useWorkspaceStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [folderData, setFolderData] = useState<any | null>(null);
  const [spacePermissionLevel, setSpacePermissionLevel] = useState<SpacePermissionLevel | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showFolderPermissions, setShowFolderPermissions] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'lists' | 'activity'>('lists');
  const [folderActivity, setFolderActivity] = useState<any[]>([]);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [folderMembers, setFolderMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberPermissions, setMemberPermissions] = useState<Record<string, SpacePermissionLevel>>({});
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  const { isAdmin, isOwner } = usePermission(spacePermissionLevel);
  const canManage = isAdmin || isOwner;

  const folder = useMemo(
    () => folderData || folders.find((f) => f._id === folderId) || null,
    [folderData, folders, folderId]
  );
  const workspaceMembersForInvite = useMemo(() => {
    return (workspace?.members || [])
      .map((member: any) => ({
        user: typeof member.user === 'object' ? member.user : null,
        role: member.role || 'member',
      }))
      .filter((member: any) => !!member.user?._id);
  }, [workspace]);

  const folderLists = folder?.lists || [];
  const totalTasks = folderLists.reduce((sum: number, l: any) => sum + (l.taskCount || 0), 0);
  const completedTasks = folderLists.reduce((sum: number, l: any) => sum + (l.completedCount || 0), 0);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  useEffect(() => {
    if (!workspaceId || !spaceId || !userId) return;

    let active = true;
    const init = async () => {
      try {
        const workspaceRes = await api.get(`/workspaces/${workspaceId}`);
        if (!active) return;
        const workspaceData = workspaceRes.data.data;
        setWorkspace(workspaceData);

        const workspaceOwnerId = typeof workspaceData.owner === 'string'
          ? workspaceData.owner
          : workspaceData.owner?._id;
        const isOwnerUser = workspaceOwnerId === userId;
        const workspaceMember = workspaceData.members.find((m: any) => {
          const memberId = typeof m.user === 'string' ? m.user : m.user._id;
          return memberId === userId;
        });
        const role: 'owner' | 'admin' | 'member' | 'guest' =
          isOwnerUser ? 'owner' : (workspaceMember?.role === 'admin' || workspaceMember?.role === 'owner') ? 'admin' : 'member';
        setWorkspaceContext(workspaceId, role);

        await Promise.all([
          fetchSpace(spaceId).catch(() => null),
          fetchFolders(spaceId).catch(() => null),
          api.get(`/folders/${folderId}`).then((res) => {
            if (!active) return;
            setFolderData(res.data?.data || null);
          }).catch(() => null),
        ]);

        try {
          const spaceMembersRes = await api.get(`/spaces/${spaceId}/space-members`);
          if (!active) return;
          const currentUserMember = spaceMembersRes.data.data.find((m: any) => {
            const memberId = typeof m.user === 'string' ? m.user : m.user?._id;
            return memberId === userId;
          });
          if (currentUserMember?.spacePermissionLevel) {
            setSpacePermissionLevel(currentUserMember.spacePermissionLevel);
          }
        } catch {
          // Best-effort only
        }
      } catch (error: any) {
        console.error('[FolderPage] Failed to initialize', error);
        toast.error(error.response?.data?.message || 'Failed to load folder');
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [workspaceId, spaceId, userId, fetchSpace, fetchFolders, setWorkspaceContext]);

  useEffect(() => {
    if (!folderId) return;
    let active = true;

    const loadActivity = async () => {
      setLoadingTabData(true);
      try {
        const activityRes = await api.get(`/folders/${folderId}/activity`);
        if (!active) return;
        setFolderActivity(activityRes.data?.data || []);
      } catch (error) {
        console.error('[FolderPage] Failed to load folder tab data:', error);
        if (active) {
          setFolderActivity([]);
        }
      } finally {
        if (active) setLoadingTabData(false);
      }
    };

    loadActivity();
    return () => {
      active = false;
    };
  }, [folderId]);

  const handleDeleteList = async (listId: string, listName: string) => {
    try {
      await deleteList(listId);
      deleteListFromWorkspace(spaceId, listId, folderId);
      toast.success(`Deleted "${listName}"`);
    } catch {
      toast.error('Failed to delete list');
    }
  };

  const fetchFolderMembers = async () => {
    try {
      const response = await api.get(`/folders/${folderId}/folder-members`);
      setFolderMembers(response.data?.data || []);
    } catch (error) {
      console.error('[FolderPage] Failed to fetch folder members for invite:', error);
      toast.error('Failed to load invite members');
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) => {
      const isSelected = prev.includes(memberId);
      if (isSelected) {
        const { [memberId]: _, ...rest } = memberPermissions;
        setMemberPermissions(rest);
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const handlePermissionChange = (memberId: string, level: SpacePermissionLevel) => {
    setMemberPermissions((prev) => ({ ...prev, [memberId]: level }));
  };

  const handleAddFolderMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      await Promise.all(
        selectedMembers.map((memberId) => {
          const level = memberPermissions[memberId] || 'EDIT';
          return api.post(`/folders/${folderId}/folder-members`, {
            userId: memberId,
            permissionLevel: level,
          });
        })
      );

      toast.success(`${selectedMembers.length} member(s) invited to folder`);
      setSelectedMembers([]);
      setMemberPermissions({});
      setSearchMemberQuery('');
      setShowInviteModal(false);
      await fetchFolderMembers();
    } catch (error: any) {
      console.error('[FolderPage] Failed to invite folder members:', error);
      toast.error(error.response?.data?.message || 'Failed to invite members');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (loading && !folder) {
    return <div className="p-6 text-sm text-muted-foreground">Loading folder...</div>;
  }

  if (!folder) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-4">Folder not found or you do not have access.</p>
        <Button onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}`)}>Back to Space</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 overflow-x-auto whitespace-nowrap">
            <button onClick={() => router.push(`/workspace/${workspaceId}`)} className="hover:text-foreground">
              {workspace?.name || 'Workspace'}
            </button>
            <span>/</span>
            <button onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}`)} className="hover:text-foreground">
              {currentSpace?.name || 'Space'}
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{folder.name}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}?folder=${folder._id}`)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${folder.color || '#3b82f6'}20` }}>
                <Folder className="w-5 h-5" style={{ color: folder.color || '#3b82f6' }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate">{folder.name}</h1>
                <p className="text-sm text-muted-foreground">{folderLists.length} lists</p>
              </div>
            </div>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      await fetchFolderMembers();
                      setShowInviteModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Members
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowFolderPermissions(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Folder Access
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-2">Task Progress</p>
              <p className="text-4xl font-bold mb-2">{progress}%</p>
              <p className="text-sm text-muted-foreground">{completedTasks} of {totalTasks} tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-2">Total Lists</p>
              <p className="text-4xl font-bold mb-2">{folderLists.length}</p>
              <p className="text-sm text-muted-foreground">Inside this folder</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 p-4 border-b overflow-x-auto">
              <button
                onClick={() => setActiveTab('lists')}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${activeTab === 'lists' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Lists
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex items-center gap-1 ${activeTab === 'activity' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Activity className="w-4 h-4" />
                Activity
              </button>
            </div>

            {activeTab === 'lists' && (
              <>
            <div className="flex items-center justify-between p-4 border-b">
              <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Lists</h2>
              </button>
              <Button size="sm" onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}`)}>
                <Plus className="w-4 h-4 mr-1" />
                Add List
              </Button>
            </div>
            {expanded && (
              <div className="divide-y">
                {folderLists.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No lists in this folder yet.
                  </div>
                ) : (
                  folderLists.map((list: any) => (
                    <div key={list._id} className="p-4 flex items-center justify-between">
                      <button
                        className="text-left min-w-0 flex-1"
                        onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}/lists/${list._id}`)}
                      >
                        <p className="font-medium truncate">{list.name}</p>
                        <p className="text-sm text-muted-foreground">{list.completedCount || 0}/{list.taskCount || 0} tasks</p>
                      </button>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteList(list._id, list.name)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete List
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
              </>
            )}

            {activeTab === 'activity' && (
              <div className="p-4 sm:p-5">
                <ActivityLogView activities={folderActivity} loading={loadingTabData} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FolderMemberManagement
        open={showFolderPermissions}
        onOpenChange={setShowFolderPermissions}
        folderId={folder._id}
        folderName={folder.name}
        folderColor={folder.color}
      />

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        spaceColor={folder.color || '#3b82f6'}
        title="Add Members to Folder"
        description={`Select members to grant access inside ${folder.name}.`}
        searchPlaceholder="Search workspace members..."
        emptyStateMessage="No workspace members available to invite"
        availableMembers={workspaceMembersForInvite}
        selectedMembers={selectedMembers}
        memberPermissions={memberPermissions}
        onToggleMemberSelection={toggleMemberSelection}
        onPermissionChange={handlePermissionChange}
        onAddMembers={handleAddFolderMembers}
        searchQuery={searchMemberQuery}
        onSearchChange={setSearchMemberQuery}
        getInitials={getInitials}
      />
    </div>
  );
}

interface ActivityLogViewProps {
  activities: any[];
  loading: boolean;
}

function ActivityLogView({ activities, loading }: ActivityLogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'comment' | 'update'>('all');

  const filteredActivities = activities.filter((activity) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      activity.user?.name?.toLowerCase().includes(query) ||
      activity.content?.toLowerCase().includes(query) ||
      activity.fieldChanged?.toLowerCase().includes(query) ||
      activity.task?.title?.toLowerCase().includes(query);
    const matchesType = filterType === 'all' || activity.type === filterType;
    return matchesSearch && matchesType;
  });

  const groupedActivities = filteredActivities.reduce((groups: any, activity) => {
    const date = new Date(activity.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (date.toDateString() === today.toDateString()) dateKey = 'Today';
    if (date.toDateString() === yesterday.toDateString()) dateKey = 'Yesterday';

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(activity);
    return groups;
  }, {});

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading activity...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="update">Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedActivities).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No activities found</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedActivities).map(([date, dateActivities]: [string, any]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">{date}</Badge>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-3 pl-4 border-l-2 border-border">
              {dateActivities.map((activity: any) => (
                <ActivityItem key={activity._id} activity={activity} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const user = activity.user || { name: 'Unknown User', avatar: null };
  const taskTitle = typeof activity.task === 'object' ? activity.task?.title || 'Unknown Task' : 'Task';

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'inprogress') return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
    if (s === 'review') return <Badge className="bg-purple-100 text-purple-700">Review</Badge>;
    if (s === 'done') return <Badge className="bg-green-100 text-green-700">Done</Badge>;
    if (s === 'cancelled') return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">To Do</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return <Badge className="bg-slate-100 text-slate-600">Low</Badge>;
    if (p === 'high') return <Badge className="bg-orange-100 text-orange-600">High</Badge>;
    if (p === 'urgent') return <Badge className="bg-red-100 text-red-600">Urgent</Badge>;
    return <Badge className="bg-blue-100 text-blue-600">Medium</Badge>;
  };

  return (
    <div className="py-3">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-blue-600 text-white text-sm">{getInitials(user.name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground leading-7">
            {activity.type === 'comment' ? (
              <>
                <span className="font-semibold">{user.name}</span> commented on{' '}
                <span className="text-blue-600 font-medium">{taskTitle}</span>
              </>
            ) : activity.fieldChanged === 'title' && !activity.oldValue ? (
              <>
                <span className="font-semibold">{user.name}</span> created task{' '}
                <span className="text-blue-600 font-medium">{taskTitle}</span>
              </>
            ) : (
              <>
                <span className="font-semibold">{user.name}</span> changed{' '}
                <span className="font-medium">{activity.fieldChanged || 'field'}</span> on{' '}
                <span className="text-blue-600 font-medium">{taskTitle}</span>
              </>
            )}
          </div>

          {activity.type === 'comment' && activity.content && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{activity.content}</p>
          )}

          {activity.type === 'update' && activity.fieldChanged !== 'title' && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              {activity.fieldChanged === 'status' && (
                <>
                  {getStatusBadge(activity.oldValue)}
                  <span className="text-muted-foreground">→</span>
                  {getStatusBadge(activity.newValue)}
                </>
              )}
              {activity.fieldChanged === 'priority' && (
                <>
                  {getPriorityBadge(activity.oldValue)}
                  <span className="text-muted-foreground">→</span>
                  {getPriorityBadge(activity.newValue)}
                </>
              )}
              {activity.fieldChanged === 'assignee' && (
                <span className="text-muted-foreground">
                  {activity.oldValue?.name || 'Unassigned'} → {activity.newValue?.name || 'Unassigned'}
                </span>
              )}
              {!['status', 'priority', 'assignee'].includes(activity.fieldChanged) && (
                <span className="text-muted-foreground">
                  {String(activity.oldValue || 'None')} → {String(activity.newValue || 'None')}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="w-4 h-4" />
            <span>{formatTime(activity.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
