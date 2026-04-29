'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';
import { api } from '@/lib/axios';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Loader2,
  User,
  Calendar,
  Clock,
  Timer,
  ChevronRight,
  Paperclip,
  MessageSquare,
  Activity as ActivityIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/ui/user-avatar';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  startDate?: string;
  timeSpent?: number;
  list: {
    _id: string;
    name: string;
    space?: {
      _id: string;
      name: string;
      workspace?: {
        _id: string;
        name: string;
      };
    };
  };
  comments?: Comment[];
  activity?: Activity[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    avatar?: string;
  };
  createdAt: string;
}

interface Activity {
  _id: string;
  type: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Attachment {
  _id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  fileType: string;
  fileSize: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export function TaskDetailSidebar() {
  const { isOpen, taskId, closeTask } = useTaskSidebarStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('null');
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch task data
  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/tasks/${taskId}`);
      const taskData = response.data.data || response.data;
      
      setTask(taskData);
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setStatus(taskData.status);
      setPriority(taskData.priority);
      setStartDate(taskData.startDate ? new Date(taskData.startDate).toISOString().split('T')[0] : '');
      setDueDate(taskData.dueDate ? new Date(taskData.dueDate).toISOString().split('T')[0] : '');
      setDeadline(taskData.deadline ? new Date(taskData.deadline).toISOString().split('T')[0] : '');
      setAssigneeId(taskData.assignee?._id || 'null');
    } catch (err: any) {
      console.error('Failed to fetch task:', err);
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
    }
  }, [isOpen, taskId, fetchTask]);

  // Fetch workspace members for assignee selection
  useEffect(() => {
    const fetchMembers = async () => {
      if (task?.list?.space?.workspace?._id) {
        try {
          const response = await api.get(`/workspaces/${task.list.space.workspace._id}/members`);
          setWorkspaceMembers(response.data.data || []);
        } catch (err) {
          console.error('Failed to fetch members:', err);
        }
      }
    };
    fetchMembers();
  }, [task?.list?.space?.workspace?._id]);

  // Auto-save with debounce
  const autoSave = useCallback(async (field: string, value: any) => {
    if (!taskId) return;

    try {
      setSaving(true);
      await api.patch(`/tasks/${taskId}`, { [field]: value });
      // Refresh task to get updated activity
      await fetchTask();
    } catch (err: any) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [taskId, fetchTask]);

  // Debounced save for title and description
  const debouncedSave = useCallback((field: string, value: any) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      autoSave(field, value);
    }, 500);

    setDebounceTimer(timer);
  }, [debounceTimer, autoSave]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debouncedSave('title', newTitle);
  };

  // Handle description change
  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    debouncedSave('description', newDescription);
  };

  // Handle status change (immediate save)
  const handleStatusChange = (newStatus: Task['status']) => {
    setStatus(newStatus);
    autoSave('status', newStatus);
  };

  // Handle priority change (immediate save)
  const handlePriorityChange = (newPriority: Task['priority']) => {
    setPriority(newPriority);
    autoSave('priority', newPriority);
  };

  // Handle Date changes
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    autoSave('startDate', val || null);
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    autoSave('dueDate', val || null);
  };

  const handleDeadlineChange = (val: string) => {
    setDeadline(val);
    autoSave('deadline', val || null);
  };

  // Handle Assignee change
  const handleAssigneeChange = (val: string) => {
    const newVal = val === 'null' ? null : val;
    setAssigneeId(val);
    autoSave('assignee', newVal);
  };

  // Handle comment submit
  const handleCommentSubmit = async () => {
    if (!taskId || !commentText.trim() || saving) return;

    try {
      setSaving(true);
      await api.post(`/tasks/${taskId}/comments`, { content: commentText });
      setCommentText('');
      await fetchTask(); // Refresh comments
    } catch (err: any) {
      console.error('Failed to submit comment:', err);
      toast.error(err.response?.data?.message || 'Failed to submit comment');
    } finally {
      setSaving(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeTask();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeTask]);

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time spent
  const formatTimeSpent = (minutes?: number) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize description textarea based on content
  useEffect(() => {
    const el = descriptionRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
    }
  }, [description]);

  // Get priority color
  const getPriorityColor = (p: Task['priority']) => {
    switch (p) {
      case 'low':
        return 'text-gray-600 bg-gray-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'urgent':
        return 'text-red-600 bg-red-100';
    }
  };

  // Get status color
  const getStatusColor = (s: Task['status']) => {
    switch (s) {
      case 'todo':
        return 'text-gray-600 bg-gray-100';
      case 'in-progress':
        return 'text-blue-600 bg-blue-100';
      case 'done':
        return 'text-green-600 bg-green-100';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeTask()}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[40vw] p-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTask}>Retry</Button>
          </div>
        ) : task ? (
          <>
            {/* Header with Breadcrumb */}
            <div className="border-b p-4 space-y-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{task.list.space?.workspace?.name || 'Workspace'}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{task.list.space?.name || 'Space'}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-900 font-medium">{task.list.name}</span>
              </div>

              {/* Title */}
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                placeholder="Task title"
              />

              {/* Status and Priority */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className={`h-8 w-full sm:w-[140px] ${getStatusColor(status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className={`h-8 w-full sm:w-[120px] ${getPriorityColor(priority)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                {saving && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Assignee
                    </Label>
                    <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                      <SelectTrigger className="h-8 border-none p-0 focus:ring-0 bg-transparent hover:bg-slate-50">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Unassigned</SelectItem>
                        {workspaceMembers.map((member) => (
                          <SelectItem key={member._id} value={member._id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due Date
                    </Label>
                    <Input 
                      type="date" 
                      value={dueDate} 
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className="h-8 border-none p-0 focus-visible:ring-0 bg-transparent text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Start Date
                    </Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="h-8 border-none p-0 focus-visible:ring-0 bg-transparent text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Deadline
                    </Label>
                    <Input 
                      type="date" 
                      value={deadline} 
                      onChange={(e) => handleDeadlineChange(e.target.value)}
                      className="h-8 border-none p-0 focus-visible:ring-0 bg-transparent text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Time Spent
                    </Label>
                    <p className="text-sm font-medium h-8 flex items-center">{formatTimeSpent(task.timeSpent)}</p>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="w-full min-h-[120px] p-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden leading-relaxed"
                    placeholder="Add a description..."
                    style={{ height: 'auto' }}
                  />
                </div>

                <Separator />

                {/* Attachments */}
                {task.attachments && task.attachments.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Attachments ({task.attachments.length})
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        {task.attachments.map((attachment) => (
                          <a
                            key={attachment._id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-purple-500 transition-colors group"
                          >
                            {attachment.thumbnailUrl ? (
                              <img
                                src={attachment.thumbnailUrl}
                                alt={attachment.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <Paperclip className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Activity Feed */}
                {task.activity && task.activity.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <ActivityIcon className="w-4 h-4" />
                        Activity
                      </Label>
                      <div className="space-y-3">
                        {task.activity.map((activity) => (
                          <div key={activity._id} className="flex gap-3 text-sm">
                          <UserAvatar 
                            user={activity.user} 
                            className="w-6 h-6 flex-shrink-0" 
                          />
                            <div className="flex-1">
                              <p className="text-gray-700">
                                <span className="font-medium">{activity.user.name}</span>{' '}
                                {activity.field && (
                                  <>
                                    changed <span className="font-medium">{activity.field}</span>
                                    {activity.oldValue && activity.newValue && (
                                      <>
                                        {' '}from <span className="font-medium">{activity.oldValue}</span> to{' '}
                                        <span className="font-medium">{activity.newValue}</span>
                                      </>
                                    )}
                                  </>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Comments */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments ({task.comments?.length || 0})
                  </Label>
                  
                  {task.comments && task.comments.length > 0 && (
                    <div className="space-y-4">
                      {task.comments.map((comment) => (
                        <div key={comment._id} className="flex gap-3">
                          <UserAvatar 
                            user={comment.author} 
                            className="w-8 h-8 flex-shrink-0" 
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{comment.author.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      className="flex-1"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit();
                        }
                      }}
                      disabled={saving}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleCommentSubmit}
                      disabled={saving || !commentText.trim()}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
