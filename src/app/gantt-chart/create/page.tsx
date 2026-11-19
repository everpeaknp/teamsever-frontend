"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { GanttTaskTable } from "@/components/gantt/GanttTaskTable";
import { GanttTimeline } from "@/components/gantt/GanttTimeline";
import { GanttTask } from "@/components/gantt/types";
import { debounce, getTodayString, addDays } from "@/components/gantt/ganttUtils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileUp,
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  Search,
  Download,
  Maximize2,
  Minimize2,
  LogOut,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { GanttWizard } from "@/components/tasks/gantt/GanttWizard";
import { type PromptAnswers, generateProject } from "@/lib/gantt/ganttEngine";
import { isAuthenticated, getCurrentUser, logout } from "@/lib/auth";

interface GanttChartData {
  _id: string;
  title: string;
  tasks: any[];
  isPersonal: boolean;
  createdBy: any;
  updatedAt: string;
}

export default function PersonalGanttPage() {
  const router = useRouter();
  const [charts, setCharts] = useState<GanttChartData[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState<"days" | "weeks">("days");
  const [splitPosition, setSplitPosition] = useState(45);
  const [showNewChartDialog, setShowNewChartDialog] = useState(false);
  const [newChartTitle, setNewChartTitle] = useState("");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const starterCreatedRef = useRef<Set<string>>(new Set());

  const currentUser = getCurrentUser();
  const selectedChart = charts.find((c) => c._id === selectedChartId);

  const fetchCharts = async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      const res = await api.get("/gantt/personal", { timeout: 10000 });
      
      // Set loading to false FIRST, before any other processing
      setIsLoading(false);
      
      // Handle response data safely
      const chartsData = Array.isArray(res.data) ? res.data : [];
      setCharts(chartsData);

      if (chartsData.length > 0 && !selectedChartId) {
        setSelectedChartId(chartsData[0]._id);
      }
    } catch (error: any) {
      setIsLoading(false); // Always stop loading
      if (error.response?.status === 401) {
        router.push("/login?redirect=/gantt-chart/create");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load charts");
    }
  };

  // Initialize: check auth and fetch charts
  useEffect(() => {
    const init = async () => {
      // Check auth first
      if (!isAuthenticated()) {
        router.push("/login?redirect=/gantt-chart/create");
        setIsLoading(false); // Stop loading before redirect
        return;
      }

      // Fetch charts
      await fetchCharts();
    };

    init();
  }, []);

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

  // Create starter tasks if chart is empty
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
  };

  const handleCollapseAll = () => {
    const updatedTasks = tasks.map((t) => ({ ...t, isCollapsed: true }));
    saveTasksToBackend(updatedTasks);
  };

  const handleExportCSV = () => {
    const headers = ["WBS", "Task Name", "Status", "Start", "End", "Progress"];
    const rows = tasks.map((t) => [
      t.wbs || "",
      t.name,
      t.status || "not-started",
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

  const handleCreateNewChart = async () => {
    if (!newChartTitle.trim()) {
      toast.error("Please enter a chart title");
      return;
    }

    try {
      const today = getTodayString();
      const starterTasks = [
        {
          id: `task-${Date.now()}-1`,
          name: "Summary task",
          phase: "Phase 1",
          assignee: "",
          start: today,
          end: addDays(today, 7),
          duration: 7,
          progress: 0,
          dependsOn: [],
          order: 0,
          status: "not-started",
          isMilestone: false,
        },
        {
          id: `task-${Date.now()}-2`,
          name: "Task 1",
          phase: "Phase 1",
          assignee: "",
          start: today,
          end: addDays(today, 3),
          duration: 3,
          progress: 0,
          dependsOn: [],
          parent: `task-${Date.now()}-1`,
          order: 0,
          status: "not-started",
          isMilestone: false,
        },
      ];

      const res = await api.post("/gantt/personal", {
        title: newChartTitle,
        tasks: starterTasks,
      });

      await fetchCharts(true);
      setSelectedChartId(res.data._id);
      starterCreatedRef.current.add(res.data._id);
      setShowNewChartDialog(false);
      setNewChartTitle("");
      toast.success("Chart created");
    } catch (error: any) {
      toast.error("Failed to create chart");
    }
  };

  const handleDeleteChart = async () => {
    if (!selectedChart) return;

    try {
      await api.delete(`/gantt/${selectedChart._id}`);
      await fetchCharts(true);
      toast.success("Chart deleted");
    } catch (error: any) {
      toast.error("Failed to delete chart");
    }
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
      toast.error("Failed to generate chart");
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile || !selectedChart) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await api.post(`/gantt/${selectedChart._id}/upload-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header - Always Show */}
        <div className="border-b bg-white px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/teamsever_logo.png" alt="TeamsEver" width={24} height={24} className="h-6 w-auto" />
                <span className="text-lg font-bold">TeamsEver</span>
              </Link>

              {/* Chart Selector */}
              <Select value={selectedChartId || undefined} onValueChange={setSelectedChartId} disabled>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="My Gantt charts" />
                </SelectTrigger>
              </Select>

              <Button onClick={() => setShowNewChartDialog(true)} size="sm" variant="outline" disabled>
                <Plus className="h-4 w-4 mr-1.5" />
                New Chart
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2" disabled>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{currentUser?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Loading State in Chart Area Only */}
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/teamsever_logo.png" alt="TeamsEver" width={24} height={24} className="h-6 w-auto" />
              <span className="text-lg font-bold">TeamsEver</span>
            </Link>

            {/* Chart Selector */}
            <Select value={selectedChartId || undefined} onValueChange={setSelectedChartId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="My Gantt charts" />
              </SelectTrigger>
              <SelectContent>
                {charts.map((chart) => (
                  <SelectItem key={chart._id} value={chart._id}>
                    {chart.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setShowNewChartDialog(true)} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1.5" />
              New Chart
            </Button>
          </div>

          <div className="flex items-center gap-3">
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

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{currentUser?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <User className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedChart && charts.length === 0 ? (
        /* Empty State - No Charts */
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No charts yet</h2>
            <p className="text-gray-600 mb-6">Create your first Gantt chart to start planning your projects</p>
            <Button onClick={() => setShowNewChartDialog(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create your first chart
            </Button>
          </div>
        </div>
      ) : !selectedChart && charts.length > 0 ? (
        /* Empty State - Charts Exist But None Selected */
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <ChevronDown className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a chart</h2>
            <p className="text-gray-600 mb-6">Choose a chart from the dropdown above to get started</p>
          </div>
        </div>
      ) : (
      selectedChart && (
        <>
          {/* Toolbar */}
          <div className="border-b bg-white px-6 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
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

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    Zoom: {zoomLevel === "days" ? "Days" : "Weeks"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setZoomLevel("days")}>Days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setZoomLevel("weeks")}>Weeks</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                tasks={tasks}
                members={[]} // No members for personal charts
                onTaskUpdate={handleTaskUpdate}
                onTaskAdd={handleTaskAdd}
                onTaskDelete={handleTaskDelete}
                onTaskDuplicate={handleTaskDuplicate}
                scrollContainerRef={scrollContainerRef}
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
                tasks={tasks}
                members={[]}
                zoomLevel={zoomLevel}
                onTaskUpdate={handleTaskUpdate}
                scrollContainerRef={scrollContainerRef}
                colorTheme="default"
                colorByMode="task"
              />
            </div>
          </div>
        </>
      ))}
      {/* End of main content area */}

      {/* New Chart Dialog */}
      <Dialog open={showNewChartDialog} onOpenChange={setShowNewChartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Gantt Chart</DialogTitle>
            <DialogDescription>Give your chart a name to get started</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Q1 Product Launch"
              value={newChartTitle}
              onChange={(e) => setNewChartTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateNewChart()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewChart}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg p-6">
            <GanttWizard onComplete={handleWizardComplete} onCancel={() => setShowWizard(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
