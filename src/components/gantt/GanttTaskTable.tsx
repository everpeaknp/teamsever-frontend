"use client";

import React, { useState } from "react";
import { GanttTask, WorkspaceMember } from "./types";
import { getVisibleTasks } from "./ganttUtils";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Circle,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ColorPicker } from "./ColorPicker";

interface GanttTaskTableProps {
  tasks: GanttTask[];
  members: WorkspaceMember[];
  onTaskUpdate: (taskId: string, updates: Partial<GanttTask>) => void;
  onTaskAdd: (parentId?: string, isMilestone?: boolean) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskDuplicate: (taskId: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  isReadOnly?: boolean;
}

export const GanttTaskTable: React.FC<GanttTaskTableProps> = ({
  tasks,
  members,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onTaskDuplicate,
  scrollContainerRef,
  isReadOnly = false,
}) => {
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const visibleTasks = getVisibleTasks(tasks);

  const handleCellClick = (taskId: string, field: string, currentValue: string) => {
    if (isReadOnly) return;
    setEditingCell({ taskId, field });
    setEditValue(currentValue);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      let updates: Partial<GanttTask> = {};

      if (editingCell.field === "name") {
        updates.name = editValue;
      } else if (editingCell.field === "startDate") {
        updates.startDate = editValue;
      } else if (editingCell.field === "endDate") {
        updates.endDate = editValue;
      } else if (editingCell.field === "progress") {
        const numValue = parseInt(editValue, 10);
        updates.progress = isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
      }

      onTaskUpdate(editingCell.taskId, updates);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellBlur();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const toggleCollapse = (taskId: string) => {
    const task = tasks.find((t) => t._id === taskId);
    if (task) {
      onTaskUpdate(taskId, { isCollapsed: !task.isCollapsed });
    }
  };

  const getTaskDepth = (task: GanttTask): number => {
    let depth = 0;
    let current = task;
    while (current.parentId) {
      depth++;
      const parent = tasks.find((t) => t._id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return depth;
  };

  const hasChildren = (taskId: string): boolean => {
    return tasks.some((t) => t.parentId === taskId);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "in-progress":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "on-hold":
        return "text-orange-600";
      default:
        return "text-gray-400";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "not-started":
        return "Open";
      case "in-progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "on-hold":
        return "On Hold";
      default:
        return "Open";
    }
  };

  const getMemberById = (id?: string) => {
    return members.find((m) => m._id === id);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center h-10 text-xs font-semibold text-gray-700">
          <div className="w-[60px] px-2 border-r border-gray-200 flex-shrink-0">WBS</div>
          <div className="flex-1 min-w-[220px] px-2 border-r border-gray-200">Task Name</div>
          <div className="w-[140px] px-2 border-r border-gray-200 flex-shrink-0">Assigned</div>
          <div className="w-[120px] px-2 border-r border-gray-200 flex-shrink-0">Status</div>
          <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0">Start</div>
          <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0">End</div>
          <div className="w-[90px] px-2 border-r border-gray-200 flex-shrink-0">Progress %</div>
          <div className="w-[40px] flex-shrink-0"></div>
        </div>
      </div>

      {/* Task Rows */}
      <div>
        {visibleTasks.map((task) => {
          const depth = getTaskDepth(task);
          const hasChild = hasChildren(task._id);
          const member = getMemberById(task.assigneeId);
          const isSummary = hasChild;

          return (
            <React.Fragment key={task._id}>
              <div
                className="flex items-center h-[40px] text-sm border-b border-gray-100 hover:bg-gray-50 group"
              >
                {/* WBS */}
                <div className="w-[60px] px-2 border-r border-gray-200 flex-shrink-0 text-xs text-gray-500">
                  {task.wbs}
                </div>

                {/* Task Name */}
                <div
                  className="flex-1 min-w-[220px] px-2 border-r border-gray-200 flex items-center gap-1"
                  style={{ paddingLeft: `${depth * 20 + 8}px` }}
                >
                  {hasChild ? (
                    <button
                      onClick={() => toggleCollapse(task._id)}
                      className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded flex-shrink-0"
                    >
                      {task.isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <div className="w-4 flex-shrink-0" />
                  )}

                  {/* Color indicator */}
                  <ColorPicker
                    currentColor={task.color}
                    onColorChange={(color) => {
                      if (!isReadOnly) {
                        onTaskUpdate(task._id, { color });
                      }
                    }}
                    disabled={isReadOnly}
                    trigger={
                      <button
                        type="button"
                        className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-primary transition-all"
                        style={{ backgroundColor: task.color || "#3b82f6" }}
                        title="Change color"
                        onClick={(e) => {
                          if (isReadOnly) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                      />
                    }
                  />

                  {editingCell?.taskId === task._id && editingCell.field === "name" ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      className="flex-1 px-1 py-0.5 border border-blue-500 rounded outline-none text-sm"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(task._id, "name", task.name)}
                      className={`flex-1 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded ${
                        isSummary ? "font-semibold" : ""
                      }`}
                    >
                      {task.name}
                    </span>
                  )}
                </div>

                {/* Assigned */}
                <div className="w-[140px] px-2 border-r border-gray-200 flex-shrink-0">
                  {isReadOnly ? (
                    <div className="text-xs px-1 py-0.5">
                      {member ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{member.name}</span>
                        </div>
                      ) : (
                        "Unassigned"
                      )}
                    </div>
                  ) : (
                    <Select
                      value={task.assigneeId || "unassigned"}
                      onValueChange={(value) =>
                        onTaskUpdate(task._id, { assigneeId: value === "unassigned" ? undefined : value })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs border-0 hover:bg-gray-100">
                        <SelectValue>
                          {member ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{member.name}</span>
                            </div>
                          ) : (
                            "Unassigned"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m._id} value={m._id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">{getInitials(m.name)}</AvatarFallback>
                              </Avatar>
                              {m.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Status */}
                <div className="w-[120px] px-2 border-r border-gray-200 flex-shrink-0">
                  {isReadOnly ? (
                    <div className="text-xs px-1 py-0.5 flex items-center gap-1.5">
                      <Circle className={`w-2 h-2 fill-current ${getStatusColor(task.status)}`} />
                      <span className="truncate">{getStatusLabel(task.status)}</span>
                    </div>
                  ) : (
                    <Select
                      value={task.status || "not-started"}
                      onValueChange={(value) => onTaskUpdate(task._id, { status: value as any })}
                    >
                      <SelectTrigger className="h-7 text-xs border-0 hover:bg-gray-100">
                        <SelectValue>
                          <div className="flex items-center gap-1.5">
                            <Circle className={`w-2 h-2 fill-current ${getStatusColor(task.status)}`} />
                            <span className="truncate">{getStatusLabel(task.status)}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-started">
                          <div className="flex items-center gap-2">
                            <Circle className="w-2 h-2 fill-current text-gray-400" />
                            Open
                          </div>
                        </SelectItem>
                        <SelectItem value="in-progress">
                          <div className="flex items-center gap-2">
                            <Circle className="w-2 h-2 fill-current text-blue-600" />
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <Circle className="w-2 h-2 fill-current text-green-600" />
                            Completed
                          </div>
                        </SelectItem>
                        <SelectItem value="on-hold">
                          <div className="flex items-center gap-2">
                            <Circle className="w-2 h-2 fill-current text-orange-600" />
                            On Hold
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Start Date */}
                <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0">
                  {editingCell?.taskId === task._id && editingCell.field === "startDate" ? (
                    <input
                      type="date"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      className="w-full px-1 py-0.5 border border-blue-500 rounded outline-none text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(task._id, "startDate", task.startDate)}
                      className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded block text-xs"
                    >
                      {task.startDate}
                    </span>
                  )}
                </div>

                {/* End Date */}
                <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0">
                  {editingCell?.taskId === task._id && editingCell.field === "endDate" ? (
                    <input
                      type="date"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      className="w-full px-1 py-0.5 border border-blue-500 rounded outline-none text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(task._id, "endDate", task.endDate)}
                      className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded block text-xs"
                    >
                      {task.endDate}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="w-[90px] px-2 border-r border-gray-200 flex-shrink-0">
                  {editingCell?.taskId === task._id && editingCell.field === "progress" ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      className="w-full px-1 py-0.5 border border-blue-500 rounded outline-none text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(task._id, "progress", String(task.progress || 0))}
                      className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded block text-xs"
                    >
                      {task.progress || 0}%
                    </span>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="w-[40px] flex-shrink-0 flex items-center justify-center">
                  {!isReadOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCellClick(task._id, "name", task.name)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!isReadOnly && (
                          <ColorPicker
                            currentColor={task.color}
                            onColorChange={(color) => onTaskUpdate(task._id, { color })}
                            disabled={isReadOnly}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Palette className="w-4 h-4 mr-2" />
                                Change color
                              </DropdownMenuItem>
                            }
                          />
                        )}
                        <DropdownMenuItem onClick={() => onTaskAdd(task._id, false)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Sub-task
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTaskAdd(task._id, true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Milestone
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTaskDuplicate(task._id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTaskDelete(task._id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Add links under summary tasks */}
              {hasChild && !task.isCollapsed && !isReadOnly && (
                <div className="flex items-center h-8 text-sm border-b border-gray-100 bg-gray-50">
                  <div className="w-[60px] px-2 border-r border-gray-200 flex-shrink-0"></div>
                  <div
                    className="flex-1 min-w-[220px] px-2 border-r border-gray-200 flex items-center gap-3"
                    style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
                  >
                    <button
                      onClick={() => onTaskAdd(task._id, false)}
                      className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add a task
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      onClick={() => onTaskAdd(task._id, true)}
                      className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add a milestone
                    </button>
                  </div>
                  <div className="w-[140px] px-2 border-r border-gray-200 flex-shrink-0"></div>
                  <div className="w-[120px] px-2 border-r border-gray-200 flex-shrink-0"></div>
                  <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0"></div>
                  <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0"></div>
                  <div className="w-[90px] px-2 border-r border-gray-200 flex-shrink-0"></div>
                  <div className="w-[40px] flex-shrink-0"></div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Bottom Add Links */}
        {!isReadOnly && (
          <div className="flex items-center h-10 text-sm border-b border-gray-100 bg-white">
          <div className="w-[60px] px-2 border-r border-gray-200 flex-shrink-0"></div>
          <div className="flex-1 min-w-[220px] px-2 border-r border-gray-200 flex items-center gap-3">
            <button
              onClick={() => onTaskAdd(undefined, false)}
              className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add a task
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => onTaskAdd(undefined, true)}
              className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add a milestone
            </button>
          </div>
          <div className="w-[140px] px-2 border-r border-gray-200 flex-shrink-0"></div>
          <div className="w-[120px] px-2 border-r border-gray-200 flex-shrink-0"></div>
          <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0"></div>
          <div className="w-[110px] px-2 border-r border-gray-200 flex-shrink-0"></div>
          <div className="w-[90px] px-2 border-r border-gray-200 flex-shrink-0"></div>
          <div className="w-[40px] flex-shrink-0"></div>
          </div>
        )}
      </div>
    </div>
  );
};
