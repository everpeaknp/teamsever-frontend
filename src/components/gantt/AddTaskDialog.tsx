'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDay, parseDay, todayDay } from '@/lib/gantt/ganttEngine';

interface GanttTask {
  id: string;
  name: string;
  phase: string;
  assignee: string;
  start: string;
  duration: number;
  progress: number;
  dependsOn: string[];
  color?: string;
  parent?: string;
  isMilestone?: boolean;
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Omit<GanttTask, 'id'>) => void;
  existingTasks: GanttTask[];
  defaultPhase?: string;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onSave,
  existingTasks,
  defaultPhase = 'Phase 1',
}: AddTaskDialogProps) {
  const today = formatDay(todayDay());
  const nextWeek = formatDay(todayDay() + 7);

  const [taskName, setTaskName] = useState('');
  const [phase, setPhase] = useState(defaultPhase);
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [progress, setProgress] = useState(0);
  const [isMilestone, setIsMilestone] = useState(false);
  const [parentTask, setParentTask] = useState('');
  const [dependsOn, setDependsOn] = useState('');
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setTaskName('');
      setPhase(defaultPhase);
      setAssignee('');
      setStartDate(today);
      setEndDate(nextWeek);
      setProgress(0);
      setIsMilestone(false);
      setParentTask('');
      setDependsOn('');
    }
  }, [open, defaultPhase, today, nextWeek]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskName.trim()) {
      toast.error('Task name is required');
      return;
    }

    if (!startDate) {
      toast.error('Start date is required');
      return;
    }

    if (!endDate) {
      toast.error('End date is required');
      return;
    }

    const startDay = parseDay(startDate);
    const endDay = parseDay(endDate);

    if (!startDay || !endDay) {
      toast.error('Invalid date format');
      return;
    }

    if (endDay < startDay) {
      toast.error('End date cannot be before start date');
      return;
    }

    const duration = Math.max(1, endDay - startDay + 1);

    const newTask: Omit<GanttTask, 'id'> = {
      name: taskName.trim(),
      phase: phase || defaultPhase,
      assignee: assignee.trim(),
      start: startDate,
      duration,
      progress: Math.max(0, Math.min(100, progress)),
      dependsOn: dependsOn ? [dependsOn] : [],
      color: isMilestone ? '#f59e0b' : '#3b82f6',
      parent: parentTask || undefined,
      isMilestone,
    };

    onSave(newTask);

    if (saveAndAddAnother) {
      // Reset only task name and keep other values
      setTaskName('');
      toast.success('Task added! Add another');
    } else {
      onOpenChange(false);
      toast.success('Task added successfully');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Get unique phases from existing tasks
  const phases = Array.from(new Set(existingTasks.map(t => t.phase).filter(Boolean)));
  if (!phases.includes(defaultPhase)) {
    phases.unshift(defaultPhase);
  }

  // Get potential parent tasks (not milestones)
  const parentTasks = existingTasks.filter(t => !t.isMilestone);

  // Get potential dependency tasks
  const dependencyTasks = existingTasks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your Gantt chart. Press Enter to save quickly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Task Name */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="task-name">
                Task Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-name"
                placeholder="Enter task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Phase */}
            <div className="space-y-2">
              <Label htmlFor="phase">Phase / Category</Label>
              <Input
                id="phase"
                placeholder="e.g., Planning, Development"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                list="phase-suggestions"
              />
              <datalist id="phase-suggestions">
                {phases.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee (Optional)</Label>
              <Input
                id="assignee"
                placeholder="Enter assignee name"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Milestone Checkbox */}
            <div className="flex items-center space-x-2 pt-7">
              <Checkbox
                id="milestone"
                checked={isMilestone}
                onCheckedChange={(checked) => setIsMilestone(checked as boolean)}
              />
              <Label htmlFor="milestone" className="cursor-pointer">
                Mark as Milestone
              </Label>
            </div>

            {/* Parent Task */}
            {parentTasks.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="parent-task">Parent Task (Optional)</Label>
                <Select value={parentTask} onValueChange={setParentTask}>
                  <SelectTrigger id="parent-task">
                    <SelectValue placeholder="No parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent</SelectItem>
                    {parentTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Depends On */}
            {dependencyTasks.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="depends-on">Depends On (Optional)</Label>
                <Select value={dependsOn} onValueChange={setDependsOn}>
                  <SelectTrigger id="depends-on">
                    <SelectValue placeholder="No dependency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No dependency</SelectItem>
                    {dependencyTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <div className="flex items-center space-x-2 mr-auto">
              <Checkbox
                id="save-and-add"
                checked={saveAndAddAnother}
                onCheckedChange={(checked) => setSaveAndAddAnother(checked as boolean)}
              />
              <Label htmlFor="save-and-add" className="cursor-pointer text-sm">
                Save & Add Another
              </Label>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {saveAndAddAnother ? 'Save & Add Another' : 'Save Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
