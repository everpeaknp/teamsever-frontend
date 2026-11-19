'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, MoreVertical, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';

export interface GanttChartData {
  _id: string;
  workspace: string;
  title: string;
  skipWeekends: boolean;
  tasks: Array<{
    id: string;
    name: string;
    phase: string;
    assignee: string;
    start: string;
    duration: number;
    progress: number;
    dependsOn: string[];
    color?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface GanttChartManagerProps {
  workspaceId: string;
  charts: GanttChartData[];
  selectedChartId: string | null;
  onSelectChart: (chartId: string | null) => void;
  onChartsChange: () => void;
}

export function GanttChartManager({
  workspaceId,
  charts,
  selectedChartId,
  onSelectChart,
  onChartsChange,
}: GanttChartManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [newChartTitle, setNewChartTitle] = useState('');
  const [renameChartId, setRenameChartId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const selectedChart = charts.find((c) => c._id === selectedChartId);

  const handleCreateChart = async () => {
    if (!newChartTitle.trim()) {
      toast.error('Please enter a chart title');
      return;
    }

    try {
      const res = await api.post(`/gantt?workspaceId=${workspaceId}`, {
        title: newChartTitle.trim(),
        skipWeekends: true,
        tasks: [],
      });

      toast.success(`"${res.data.title}" has been created`);
      setIsCreating(false);
      setNewChartTitle('');
      onChartsChange();
      onSelectChart(res.data._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleRenameChart = async () => {
    if (!renameChartId || !renameTitle.trim()) return;

    try {
      await api.put(`/gantt/${renameChartId}`, { title: renameTitle.trim() });

      toast.success(`Chart renamed to "${renameTitle}"`);
      setIsRenaming(false);
      setRenameChartId(null);
      setRenameTitle('');
      onChartsChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleDeleteChart = async (chartId: string) => {
    try {
      await api.delete(`/gantt/${chartId}`);

      toast.success('The chart has been removed');
      setIsDeletingId(null);
      if (selectedChartId === chartId) {
        onSelectChart(null);
      }
      onChartsChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const openRename = (chart: GanttChartData) => {
    setRenameChartId(chart._id);
    setRenameTitle(chart.title);
    setIsRenaming(true);
  };

  const openDelete = (chartId: string) => {
    setIsDeletingId(chartId);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 min-w-[200px] justify-between">
            <span className="truncate flex-1 text-left text-sm">
              {selectedChart ? selectedChart.title : 'Select a Chart'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {charts.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No charts yet
            </div>
          ) : (
            charts.map((chart) => (
              <DropdownMenuItem
                key={chart._id}
                onClick={() => onSelectChart(chart._id)}
                className="cursor-pointer justify-between group"
              >
                <span className="truncate flex-1">{chart.title}</span>
                {selectedChartId === chart._id && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreating(true)} className="cursor-pointer gap-2">
            <Plus className="h-4 w-4" />
            <span>Create New Chart</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedChart && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openRename(selectedChart)} className="cursor-pointer gap-2">
              <Pencil className="h-4 w-4" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDelete(selectedChart._id)}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button onClick={() => setIsCreating(true)} size="sm" className="h-9 gap-2">
        <Plus className="h-4 w-4" />
        New Chart
      </Button>

      {/* Create Chart Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Gantt Chart</DialogTitle>
            <DialogDescription>
              Give your chart a name. You can add tasks manually or upload a PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chart-title">Chart Title</Label>
              <Input
                id="chart-title"
                placeholder="e.g. Q1 Project Timeline"
                value={newChartTitle}
                onChange={(e) => setNewChartTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateChart();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChart}>Create Chart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Chart Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chart</DialogTitle>
            <DialogDescription>Enter a new name for this chart</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-title">Chart Title</Label>
              <Input
                id="rename-title"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameChart();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameChart}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!isDeletingId} onOpenChange={(open) => !open && setIsDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chart</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chart? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => isDeletingId && handleDeleteChart(isDeletingId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
