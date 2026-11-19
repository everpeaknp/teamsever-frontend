"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { GanttChartManager, GanttChartData } from "@/components/gantt/GanttChartManager";
import { GanttTaskTable } from "@/components/gantt/GanttTaskTable";
import { GanttTimeline } from "@/components/gantt/GanttTimeline";
import { GanttTask, WorkspaceMember, ColorByMode } from "@/components/gantt/types";
import { debounce, getTodayString, addDays, filterTasksByStatus } from "@/components/gantt/ganttUtils";
import { COLOR_THEMES } from "@/components/gantt/colorThemes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Calendar,
  FileUp,
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { GanttWizard } from "@/components/tasks/gantt/GanttWizard";
import { type PromptAnswers, generateProject } from "@/lib/gantt/ganttEngine";

export default function GanttPage() {
  const params = useParams();
  const workspaceId = params?.id as string;

  const [charts, setCharts] = useState<GanttChartData[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState<"days" | "weeks" | "months">("days");
  const [customDayWidth, setCustomDayWidth] = useState<number | null>(null);
  const [expandedAll, setExpandedAll] = useState(true);
  const [splitPosition, setSplitPosition] = useState(45); // percentage
  const [statusFilter, setStatusFilter] = useState<"all" | "in-progress" | "completed">("all");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [roleCheckFailed, setRoleCheckFailed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState<string>("default");
  const [colorByMode, setColorByMode] = useState<ColorByMode>("task");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const starterCreatedRef = useRef<Set<string>>(new Set());

  const selectedChart = charts.find((c) => c._id === selectedChartId);

  // Convert backend tasks to GanttTask format
  const tasks: GanttTask[] = (selectedChart?.tasks || []).map((task: any) => ({
    _id: task.id || task._id,
    name: task.name,
    phase: task.phase || "",
    assignee: task.assignee || "",
    assigneeId: task.assigneeId,
    startDate: task.start || task.startDate || getTodayString(),
    endDate: task.end || task.endDate || addDays(getTodayString(), 3),
    duration: task.duration || 3,
    progress: task.progress || 0,
    dependsOn: task.dependsOn || [],
    color: task.color,
    parentId: task.parent || task.parentId,
    wbs: task.wbs,
    order: task.order,
    status: task.status || "not-started",
    isMilestone: task.isMilestone || false,
    isCollapsed: task.isCollapsed || false,
  }));

  // Apply status filter
  const filteredTasks = filterTasksByStatus(tasks, statusFilter);

  const fetchCharts = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }

    try {
      const res = await api.get(`/gantt?workspaceId=${workspaceId}`, { timeout: 10000 });
      setCharts(res.data);

      if (!selectedChartId && res.data.length > 0) {
        setSelectedChartId(res.data[0]._id);
      }
      setLoadError(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to load charts";
      toast.error(errorMsg);
      setLoadError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(res.data.data || []);
    } catch (error: any) {
      console.error("Failed to load members:", error);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}`);
      const userId = localStorage.getItem('userId');
      
      if (res.data.success) {
        const workspace = res.data.data;
        const userMembership = workspace.members.find((m: any) => 
          (m.user._id || m.user) === userId
        );
        
        // Only guest role is read-only
        const isGuest = userMembership?.role === 'guest';
        setIsReadOnly(isGuest);
        setRoleCheckFailed(false);
      } else {
        // If can't determine role, default to read-only
        setIsReadOnly(true);
        setRoleCheckFailed(true);
      }
    } catch (error: any) {
      console.error("Failed to check user role:", error);
      // Default to read-only if role check fails
      setIsReadOnly(true);
      setRoleCheckFailed(true);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchCharts();
      fetchMembers();
      fetchUserRole();
    }
  }, [workspaceId]);

  // Load color settings from localStorage
  useEffect(() => {
    if (selectedChartId) {
      try {
        const savedTheme = localStorage.getItem(`gantt-theme-${selectedChartId}`);
        const savedColorBy = localStorage.getItem(`gantt-colorby-${selectedChartId}`);
        
        if (savedTheme && COLOR_THEMES.find(t => t.id === savedTheme)) {
          setColorTheme(savedTheme);
        } else {
          setColorTheme('default');
        }
        
        if (savedColorBy && ['task', 'status', 'assignee'].includes(savedColorBy)) {
          setColorByMode(savedColorBy as ColorByMode);
        } else {
          setColorByMode('task');
        }
      } catch (e) {
        // localStorage might be blocked, use defaults
        setColorTheme('default');
        setColorByMode('task');
      }
    }
  }, [selectedChartId]);

  // Create starter tasks if chart is empty (only once per chart)
  useEffect(() => {
    if (
      selectedChart &&
      tasks.length === 0 &&
      !starterCreatedRef.current.has(selectedChart._id)
    ) {
      starterCreatedRef.current.add(selectedChart._id);

      const today = getTodayString();
      const starterTasks: GanttTask[] = [
        {
          _id: `task-${Date.now()}-1`,
          name: "Summary task",
          phase: "Phase 1",
          assignee: "",
          startDate: today,
          endDate: addDays(today, 7),
          duration: 7,
          progress: 0,
          dependsOn: [],
          order: 0,
          status: "not-started",
          isMilestone: false,
        },
        {
          _id: `task-${Date.now()}-2`,
          name: "Task 1",
          phase: "Phase 1",
          assignee: "",
          startDate: today,
          endDate: addDays(today, 3),
          duration: 3,
          progress: 0,
          dependsOn: [],
          parentId: `task-${Date.now()}-1`,
          order: 0,
          status: "not-started",
          isMilestone: false,
        },
      ];

      saveTasksToBackend(starterTasks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChart?._id]);

  const saveTasksToBackend = async (updatedTasks: GanttTask[]) => {
    if (!selectedChart) return;

    const backendTasks = updatedTasks.map((task) => ({
      id: task._id,
      name: task.name,
      phase: task.phase,
      assignee: task.assignee,
      assigneeId: task.assigneeId,
      start: task.startDate,
      end: task.endDate,
      duration: task.duration,
      progress: task.progress,
      dependsOn: task.dependsOn,
      color: task.color,
      parent: task.parentId,
      wbs: task.wbs,
      order: task.order,
      status: task.status,
      isMilestone: task.isMilestone,
      isCollapsed: task.isCollapsed,
    }));

    try {
      setSaveStatus("saving");
      await api.put(`/gantt/${selectedChart._id}`, { tasks: backendTasks });

      setSaveStatus("saved");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);

      // Update local charts state without refetching
      setCharts(prevCharts => 
        prevCharts.map(chart => 
          chart._id === selectedChart._id 
            ? { ...chart, tasks: backendTasks, updatedAt: new Date().toISOString() }
            : chart
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save");
      setSaveStatus("idle");
    }
  };

  const debouncedSave = useCallback(
    debounce((tasks: GanttTask[]) => saveTasksToBackend(tasks), 1000),
    [selectedChart?._id]
  );

  const handleTaskUpdate = (taskId: string, updates: Partial<GanttTask>) => {
    const updatedTasks = tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t));
    debouncedSave(updatedTasks);
  };

  const handleColorThemeChange = (themeId: string) => {
    setColorTheme(themeId);
    if (selectedChartId) {
      try {
        localStorage.setItem(`gantt-theme-${selectedChartId}`, themeId);
      } catch (e) {
        // localStorage might be blocked, ignore
      }
    }
  };

  const handleColorByChange = (mode: ColorByMode) => {
    setColorByMode(mode);
    if (selectedChartId) {
      try {
        localStorage.setItem(`gantt-colorby-${selectedChartId}`, mode);
      } catch (e) {
        // localStorage might be blocked, ignore
      }
    }
  };

  const handleTaskAdd = (parentId?: string, isMilestone?: boolean) => {
    const today = getTodayString();
    const newTask: GanttTask = {
      _id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: isMilestone ? "New Milestone" : "New Task",
      phase: "Phase 1",
      assignee: "",
      startDate: today,
      endDate: isMilestone ? today : addDays(today, 3),
      duration: isMilestone ? 0 : 3,
      progress: 0,
      dependsOn: [],
      parentId,
      order: tasks.filter((t) => t.parentId === parentId).length,
      status: "not-started",
      isMilestone: isMilestone || false,
    };
    saveTasksToBackend([...tasks, newTask]);
  };

  const handleTaskDelete = (taskId: string) => {
    setDeleteConfirm(taskId);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    const updatedTasks = tasks.filter((t) => t._id !== deleteConfirm && t.parentId !== deleteConfirm);
    saveTasksToBackend(updatedTasks);
    setDeleteConfirm(null);
    toast.success("Task deleted");
  };

  const handleTaskDuplicate = (taskId: string) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const duplicated: GanttTask = {
      ...task,
      _id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${task.name} (Copy)`,
    };
    saveTasksToBackend([...tasks, duplicated]);
    toast.success("Task duplicated");
  };

  const handleExpandAll = () => {
    const updatedTasks = tasks.map((t) => ({ ...t, isCollapsed: false }));
    saveTasksToBackend(updatedTasks);
    setExpandedAll(true);
  };

  const handleCollapseAll = () => {
    const updatedTasks = tasks.map((t) => ({ ...t, isCollapsed: true }));
    saveTasksToBackend(updatedTasks);
    setExpandedAll(false);
  };

  const handleExportCSV = () => {
    const headers = ["WBS", "Task Name", "Status", "Assigned", "Start", "End", "Progress"];
    const rows = tasks.map((t) => [
      t.wbs || "",
      t.name,
      t.status || "not-started",
      members.find((m) => m._id === t.assigneeId)?.name || "",
      t.startDate,
      t.endDate,
      `${t.progress || 0}%`,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedChart?.title || "gantt"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const handleZoomIn = () => {
    setCustomDayWidth(null); // Clear custom width
    if (zoomLevel === "months") setZoomLevel("weeks");
    else if (zoomLevel === "weeks") setZoomLevel("days");
  };

  const handleZoomOut = () => {
    setCustomDayWidth(null); // Clear custom width
    if (zoomLevel === "days") setZoomLevel("weeks");
    else if (zoomLevel === "weeks") setZoomLevel("months");
  };

  const handleZoomToFit = () => {
    if (filteredTasks.length === 0) {
      setCustomDayWidth(null);
      setZoomLevel("months");
      return;
    }

    // Calculate project date range from filtered tasks
    let minDate = filteredTasks[0].startDate;
    let maxDate = filteredTasks[0].endDate;

    filteredTasks.forEach((task) => {
      if (task.startDate < minDate) minDate = task.startDate;
      if (task.endDate > maxDate) maxDate = task.endDate;
    });

    // Add small padding
    const start = new Date(minDate);
    const end = new Date(maxDate);
    start.setDate(start.getDate() - 3);
    end.setDate(end.getDate() + 3);

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get actual timeline container width from ref (approximate as 50% of window minus some padding)
    // Timeline gets remaining width after split
    const timelineWidth = (window.innerWidth * (100 - splitPosition) / 100) - 40; // minus scrollbar/padding
    
    // Calculate required day width
    const calculatedDayWidth = timelineWidth / daysDiff;
    
    // Apply minimum of 4px per day for usability
    const finalDayWidth = Math.max(4, calculatedDayWidth);
    
    setCustomDayWidth(finalDayWidth);
    // Don't change zoomLevel so dropdown still shows current level
  };

  const handleChartsChange = () => {
    fetchCharts(true);
  };

  const handleWizardComplete = async (answers: PromptAnswers) => {
    if (!selectedChart) return;

    try {
      const generated = generateProject(answers);

      const generatedTasks: GanttTask[] = generated.tasks.map((t: any, idx: number) => ({
        _id: `task-${Date.now()}-${idx}`,
        name: t.name,
        phase: t.phase || "Phase 1",
        assignee: t.assignee || "",
        startDate: t.start,
        endDate: addDays(t.start, t.duration),
        duration: t.duration,
        progress: t.progress || 0,
        dependsOn: t.dependsOn || [],
        parentId: t.parent,
        order: idx,
        status: "not-started",
        isMilestone: t.isMilestone || false,
      }));

      await api.put(`/gantt/${selectedChart._id}`, {
        title: generated.name,
        skipWeekends: generated.skipWeekends,
        tasks: generatedTasks.map((task) => ({
          id: task._id,
          name: task.name,
          phase: task.phase,
          assignee: task.assignee,
          start: task.startDate,
          end: task.endDate,
          duration: task.duration,
          progress: task.progress,
          dependsOn: task.dependsOn,
          parent: task.parentId,
          order: task.order,
          status: task.status,
          isMilestone: task.isMilestone,
        })),
      });

      setShowWizard(false);
      toast.success("Gantt chart generated");
      starterCreatedRef.current.add(selectedChart._id);
      await fetchCharts(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate chart");
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile || !selectedChart) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await api.post(
        `/gantt/${selectedChart._id}/upload-pdf?workspaceId=${workspaceId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success(`Imported ${res.data.tasks?.length || 0} tasks from PDF`);
      setShowPdfUpload(false);
      setPdfFile(null);
      starterCreatedRef.current.add(selectedChart._id);
      await fetchCharts(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to import PDF");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-[300px]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="text-center space-y-4">
            <div className="text-red-600 font-semibold">Error Loading Gantt Charts</div>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button onClick={() => fetchCharts()} variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gantt Charts</h1>
            <p className="text-muted-foreground mt-1">
              Professional project planning with task tables and timelines
            </p>
          </div>
        </div>

        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
            <div className="rounded-full bg-primary/10 p-4">
              <Calendar className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Create Your First Gantt Chart</h2>
              <p className="text-muted-foreground">
                Start by creating a new chart to manage your project timeline
              </p>
            </div>
            <GanttChartManager
              workspaceId={workspaceId}
              charts={charts}
              selectedChartId={selectedChartId}
              onSelectChart={setSelectedChartId}
              onChartsChange={handleChartsChange}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Gantt Chart</h1>
            <GanttChartManager
              workspaceId={workspaceId}
              charts={charts}
              selectedChartId={selectedChartId}
              onSelectChart={(id) => {
                setSelectedChartId(id);
                starterCreatedRef.current.delete(id || "");
              }}
              onChartsChange={handleChartsChange}
            />
          </div>

          {saveStatus !== "idle" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Saved
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedChart && (
        <>
          {/* Toolbar */}
          <div className="border-b bg-white px-6 py-2 flex-shrink-0">
            {roleCheckFailed && (
              <div className="mb-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                Unable to verify permissions. Viewing in read-only mode.
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <>
                  <Button onClick={() => handleTaskAdd()} size="sm" className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add Task
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 h-8">
                        <FileUp className="h-3.5 w-3.5" />
                        Import
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setShowPdfUpload(true)}>
                        <FileUp className="h-4 w-4 mr-2" />
                        Import from PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowWizard(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gantt Wizard
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="h-6 w-px bg-gray-200 mx-1"></div>
                </>
              )}

              <Button onClick={handleExpandAll} variant="ghost" size="sm" className="h-8">
                <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                Expand All
              </Button>

              <Button onClick={handleCollapseAll} variant="ghost" size="sm" className="h-8">
                <Minimize2 className="h-3.5 w-3.5 mr-1.5" />
                Collapse All
              </Button>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-7 pr-3 w-48 text-sm"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    Filter: {statusFilter === "all" ? "All" : statusFilter === "in-progress" ? "In Progress" : "Completed"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("in-progress")}>In Progress</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    Zoom: {zoomLevel === "days" ? "Days" : zoomLevel === "weeks" ? "Weeks" : "Months"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => { setZoomLevel("days"); setCustomDayWidth(null); }}>Days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setZoomLevel("weeks"); setCustomDayWidth(null); }}>Weeks</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setZoomLevel("months"); setCustomDayWidth(null); }}>Months</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={handleZoomIn}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={zoomLevel === "days"}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              <Button
                onClick={handleZoomOut}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={zoomLevel === "months"}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>

              <Button
                onClick={handleZoomToFit}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title="Zoom to Fit"
              >
                <Maximize className="h-3.5 w-3.5" />
              </Button>

              <Button
                onClick={() => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                  }
                }}
                variant="outline"
                size="sm"
                className="h-8"
              >
                Today
              </Button>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              {/* Color Theme Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8" disabled={isReadOnly}>
                    <Palette className="h-3.5 w-3.5" />
                    {COLOR_THEMES.find(t => t.id === colorTheme)?.name || 'Theme'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {COLOR_THEMES.map(theme => (
                    <DropdownMenuItem 
                      key={theme.id}
                      onClick={() => handleColorThemeChange(theme.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {theme.colors.slice(0, 3).map((color, i) => (
                            <div 
                              key={i}
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {theme.name}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Color By Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    Color by: {colorByMode === 'task' ? 'Task' : colorByMode === 'status' ? 'Status' : 'Assignee'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleColorByChange('task')}>
                    Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleColorByChange('status')}>
                    Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleColorByChange('assignee')}>
                    Assignee
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 h-8">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Gantt Chart Area */}
          <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 112px)" }}>
            {/* Task Table */}
            <div style={{ width: `${splitPosition}%` }} className="flex flex-col border-r border-gray-200">
              <GanttTaskTable
                tasks={filteredTasks}
                members={members}
                onTaskUpdate={handleTaskUpdate}
                onTaskAdd={handleTaskAdd}
                onTaskDelete={handleTaskDelete}
                onTaskDuplicate={handleTaskDuplicate}
                scrollContainerRef={scrollContainerRef}
                isReadOnly={isReadOnly}
              />
            </div>

            {/* Resizer */}
            <div
              className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize flex-shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = splitPosition;

                const handleMouseMove = (e: MouseEvent) => {
                  const delta = e.clientX - startX;
                  const containerWidth = window.innerWidth;
                  const newWidth = startWidth + (delta / containerWidth) * 100;
                  setSplitPosition(Math.max(30, Math.min(70, newWidth)));
                };

                const handleMouseUp = () => {
                  window.removeEventListener("mousemove", handleMouseMove);
                  window.removeEventListener("mouseup", handleMouseUp);
                };

                window.addEventListener("mousemove", handleMouseMove);
                window.addEventListener("mouseup", handleMouseUp);
              }}
            ></div>

            {/* Timeline */}
            <div style={{ width: `${100 - splitPosition}%` }} className="flex flex-col overflow-hidden">
              <GanttTimeline
                tasks={filteredTasks}
                members={members}
                zoomLevel={zoomLevel}
                customDayWidth={customDayWidth}
                onTaskUpdate={handleTaskUpdate}
                scrollContainerRef={scrollContainerRef}
                isReadOnly={isReadOnly}
                colorTheme={colorTheme}
                colorByMode={colorByMode}
              />
            </div>
          </div>
        </>
      )}

      {/* PDF Upload Dialog */}
      <Dialog open={showPdfUpload} onOpenChange={setShowPdfUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from PDF</DialogTitle>
            <DialogDescription>
              Upload a project schedule PDF to automatically extract tasks
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfUpload(false)}>
              Cancel
            </Button>
            <Button onClick={handlePdfUpload} disabled={!pdfFile || isUploading}>
              {isUploading ? "Uploading..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              This will delete the task and all its subtasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gantt Wizard Dialog */}
      {showWizard && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <GanttWizard onComplete={handleWizardComplete} onCancel={() => setShowWizard(false)} />
          </Card>
        </div>
      )}
    </div>
  );
}
