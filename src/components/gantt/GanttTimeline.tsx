"use client";

import React, { useState, useEffect, useRef } from "react";
import { GanttTask, WorkspaceMember, ColorByMode } from "./types";
import {
  formatDate,
  addDays,
  dateDiffInDays,
  getTodayString,
  isWeekend,
  getVisibleTasks,
} from "./ganttUtils";
import { getTaskDisplayColor, getTextColor, getProgressColor } from "./colorThemes";

interface GanttTimelineProps {
  tasks: GanttTask[];
  members: WorkspaceMember[];
  zoomLevel: "days" | "weeks" | "months";
  customDayWidth?: number | null;
  onTaskUpdate: (taskId: string, updates: Partial<GanttTask>) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  isReadOnly?: boolean;
  colorTheme: string;
  colorByMode: ColorByMode;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  tasks,
  members,
  zoomLevel,
  customDayWidth = null,
  onTaskUpdate,
  scrollContainerRef,
  isReadOnly = false,
  colorTheme,
  colorByMode,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [dependencyDrag, setDependencyDrag] = useState<{
    fromTaskId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [selectedArrow, setSelectedArrow] = useState<string | null>(null);

  // Calculate date range
  const { minDate, maxDate, dateRange } = React.useMemo(() => {
    const today = getTodayString();
    if (tasks.length === 0) {
      return {
        minDate: addDays(today, -7),
        maxDate: addDays(today, 30),
        dateRange: [] as string[],
      };
    }

    // Helper to validate date strings
    const isValidDate = (dateStr: string | undefined | null): boolean => {
      if (!dateStr || typeof dateStr !== 'string') return false;
      const parts = dateStr.split('-');
      if (parts.length !== 3) return false;
      const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
      return !isNaN(date.getTime());
    };

    // Find valid date range from tasks
    let min: string | null = null;
    let max: string | null = null;

    tasks.forEach((task) => {
      if (isValidDate(task.startDate) && isValidDate(task.endDate)) {
        if (!min || task.startDate < min) min = task.startDate;
        if (!max || task.endDate > max) max = task.endDate;
      }
    });

    // Fallback to today if no valid dates found
    if (!min || !max) {
      return {
        minDate: addDays(today, -7),
        maxDate: addDays(today, 30),
        dateRange: [] as string[],
      };
    }

    // Add padding
    min = addDays(min, -7);
    max = addDays(max, 30);

    // Cap the range to 10 years (3650 days) to prevent freezing
    const minParts = min.split('-');
    const maxParts = max.split('-');
    const minDate = new Date(Date.UTC(+minParts[0], +minParts[1] - 1, +minParts[2]));
    const maxDate = new Date(Date.UTC(+maxParts[0], +maxParts[1] - 1, +maxParts[2]));
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 3650) {
      const offendingTask = tasks.find(t => !isValidDate(t.startDate) || !isValidDate(t.endDate));
      console.warn('[GANTT-DEBUG] Date range exceeds 10 years:', {
        taskId: offendingTask?._id,
        startDate: offendingTask?.startDate,
        endDate: offendingTask?.endDate,
        calculatedDays: daysDiff
      });
      max = addDays(min, 3650);
    }

    // Generate date range
    const range: string[] = [];
    let current = min;
    let iterations = 0;
    const MAX_ITERATIONS = 3650;
    
    while (current <= max && iterations < MAX_ITERATIONS) {
      range.push(current);
      const next = addDays(current, 1);
      if (next === current) {
        console.error('[GANTT-DEBUG] addDays did not advance date, breaking loop:', current);
        break;
      }
      current = next;
      iterations++;
    }

    return { minDate: min, maxDate: max, dateRange: range };
  }, [tasks]);

  const dayWidth = customDayWidth || (zoomLevel === "days" ? 40 : zoomLevel === "weeks" ? 20 : 10);

  // Scroll to today on mount
  useEffect(() => {
    if (timelineRef.current && scrollContainerRef.current) {
      const today = getTodayString();
      const todayIndex = dateRange.indexOf(today);
      if (todayIndex !== -1) {
        const scrollLeft = todayIndex * dayWidth - 200;
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollLeft);
      }
    }
  }, [dateRange, dayWidth]);

  const visibleTasks = getVisibleTasks(tasks);

  const getTaskPosition = (task: GanttTask) => {
    const startIndex = dateRange.indexOf(task.startDate);
    const endIndex = dateRange.indexOf(task.endDate);
    if (startIndex === -1 || endIndex === -1) return null;

    const left = startIndex * dayWidth;
    const width = Math.max((endIndex - startIndex + 1) * dayWidth, dayWidth);

    return { left, width };
  };

  const isSummaryTask = (taskId: string) => {
    return tasks.some((t) => t.parentId === taskId);
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    taskId: string,
    type: "move" | "resize-left" | "resize-right"
  ) => {
    if (isReadOnly) return;
    e.preventDefault();
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    setDragState({
      taskId,
      type,
      startX: e.clientX,
      startDate: task.startDate,
      endDate: task.endDate,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const daysDelta = Math.round(deltaX / dayWidth);

      if (daysDelta === 0) return;

      let newStartDate = dragState.startDate;
      let newEndDate = dragState.endDate;

      if (dragState.type === "move") {
        newStartDate = addDays(dragState.startDate, daysDelta);
        newEndDate = addDays(dragState.endDate, daysDelta);
      } else if (dragState.type === "resize-left") {
        newStartDate = addDays(dragState.startDate, daysDelta);
        if (newStartDate >= newEndDate) return;
      } else if (dragState.type === "resize-right") {
        newEndDate = addDays(dragState.endDate, daysDelta);
        if (newEndDate <= newStartDate) return;
      }

      onTaskUpdate(dragState.taskId, {
        startDate: newStartDate,
        endDate: newEndDate,
        duration: dateDiffInDays(newStartDate, newEndDate) + 1,
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, dayWidth, onTaskUpdate]);

  // Handle dependency drag
  useEffect(() => {
    if (!dependencyDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDependencyDrag((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
      );
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dependencyDrag || !timelineRef.current) {
        setDependencyDrag(null);
        return;
      }

      // Find which task the mouse is over
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);
      const taskIndex = Math.floor(relativeY / 40);
      const targetTask = visibleTasks[taskIndex];

      if (targetTask && targetTask._id !== dependencyDrag.fromTaskId) {
        const fromTask = tasks.find((t) => t._id === dependencyDrag.fromTaskId);
        if (fromTask) {
          // Check for circular dependency
          const wouldCreateCircular = (taskId: string, targetId: string): boolean => {
            if (taskId === targetId) return true;
            const task = tasks.find((t) => t._id === taskId);
            if (!task || !task.dependsOn) return false;
            return task.dependsOn.some((depId) => wouldCreateCircular(depId, targetId));
          };

          if (wouldCreateCircular(targetTask._id, dependencyDrag.fromTaskId)) {
            // Circular dependency detected - don't create
            setDependencyDrag(null);
            return;
          }

          // Add dependency
          const newDependsOn = Array.from(new Set([...(targetTask.dependsOn || []), dependencyDrag.fromTaskId]));
          onTaskUpdate(targetTask._id, { dependsOn: newDependsOn });
        }
      }

      setDependencyDrag(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dependencyDrag, tasks, visibleTasks, onTaskUpdate, scrollContainerRef]);

  const handleDependencyHandleMouseDown = (e: React.MouseEvent, taskId: string) => {
    if (isReadOnly) return;
    e.stopPropagation();
    e.preventDefault();
    setDependencyDrag({
      fromTaskId: taskId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleArrowClick = (fromTaskId: string, toTaskId: string) => {
    if (isReadOnly) return;
    setSelectedArrow(`${fromTaskId}-${toTaskId}`);
  };

  const handleDeleteDependency = () => {
    if (!selectedArrow || isReadOnly) return;
    const [fromTaskId, toTaskId] = selectedArrow.split("-");
    const task = tasks.find((t) => t._id === toTaskId);
    if (task) {
      const newDependsOn = (task.dependsOn || []).filter((id) => id !== fromTaskId);
      onTaskUpdate(toTaskId, { dependsOn: newDependsOn });
    }
    setSelectedArrow(null);
  };

  // Handle Delete key for selected arrow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if user is typing in an input or if read-only
      if (isReadOnly) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "Delete" && selectedArrow) {
        handleDeleteDependency();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedArrow, isReadOnly]);

  // Group dates by month
  const monthGroups = React.useMemo(() => {
    const groups: { month: string; start: number; count: number }[] = [];
    let currentMonth = "";
    let start = 0;
    let count = 0;

    dateRange.forEach((date, index) => {
      const parts = date.split('-');
      const dateObj = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
      const monthYear = dateObj.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

      if (monthYear !== currentMonth) {
        if (count > 0) {
          groups.push({ month: currentMonth, start, count });
        }
        currentMonth = monthYear;
        start = index;
        count = 1;
      } else {
        count++;
      }
    });

    if (count > 0) {
      groups.push({ month: currentMonth, start, count });
    }

    return groups;
  }, [dateRange]);

  const todayIndex = dateRange.indexOf(getTodayString());

  return (
    <div ref={timelineRef} className="flex-1 overflow-hidden bg-white border-l border-gray-200">
      {/* Timeline Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        {/* Month Row */}
        <div className="flex h-8 border-b border-gray-200">
          {monthGroups.map((group, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center text-xs font-semibold text-gray-700 border-r border-gray-200"
              style={{ width: group.count * dayWidth }}
            >
              {group.month}
            </div>
          ))}
        </div>

        {/* Day Row */}
        <div className="flex h-10">
          {dateRange.map((date, index) => {
            const parts = date.split('-');
            const dateObj = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
            const dayNum = dateObj.getUTCDate();
            const dayLetter = ["S", "M", "T", "W", "T", "F", "S"][dateObj.getUTCDay()];
            const weekend = isWeekend(date);

            return (
              <div
                key={date}
                className={`flex flex-col items-center justify-center text-xs border-r border-gray-200 ${
                  weekend ? "bg-gray-50" : ""
                }`}
                style={{ width: dayWidth, minWidth: dayWidth }}
              >
                <div className="font-semibold">{dayNum}</div>
                <div className="text-gray-500 text-[10px]">{dayLetter}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Body */}
      <div className="relative" style={{ width: dateRange.length * dayWidth }}>
        {/* Today Line */}
        {todayIndex !== -1 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: todayIndex * dayWidth + dayWidth / 2 }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-red-500 text-white text-[10px] px-1 rounded whitespace-nowrap">
              Today
            </div>
          </div>
        )}

        {/* Dependency Arrows */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: dateRange.length * dayWidth, height: visibleTasks.length * 40 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
          {visibleTasks.map((task, toIndex) => {
            const toPosition = getTaskPosition(task);
            if (!toPosition || !task.dependsOn) return null;

            return task.dependsOn.map((fromTaskId) => {
              const fromTask = visibleTasks.find((t) => t._id === fromTaskId);
              if (!fromTask) return null;

              const fromIndex = visibleTasks.indexOf(fromTask);
              const fromPosition = getTaskPosition(fromTask);
              if (!fromPosition) return null;

              const isSelected = selectedArrow === `${fromTaskId}-${task._id}`;

              // Draw arrow from end of fromTask to start of toTask
              const x1 = fromPosition.left + fromPosition.width;
              const y1 = fromIndex * 40 + 20;
              const x2 = toPosition.left;
              const y2 = toIndex * 40 + 20;

              const midX = (x1 + x2) / 2;

              return (
                <g key={`${fromTaskId}-${task._id}`}>
                  <path
                    d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                    stroke={isSelected ? "#ef4444" : "#3b82f6"}
                    strokeWidth={isSelected ? "2" : "1.5"}
                    fill="none"
                    markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArrowClick(fromTaskId, task._id);
                    }}
                  />
                </g>
              );
            });
          })}
        </svg>

        {/* Active dependency drag line */}
        {dependencyDrag && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          >
            <line
              x1={dependencyDrag.startX - (timelineRef.current?.getBoundingClientRect().left || 0)}
              y1={dependencyDrag.startY - (timelineRef.current?.getBoundingClientRect().top || 0) + (scrollContainerRef.current?.scrollTop || 0)}
              x2={dependencyDrag.currentX - (timelineRef.current?.getBoundingClientRect().left || 0)}
              y2={dependencyDrag.currentY - (timelineRef.current?.getBoundingClientRect().top || 0) + (scrollContainerRef.current?.scrollTop || 0)}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}

        {/* Delete dependency button */}
        {selectedArrow && !isReadOnly && (
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={handleDeleteDependency}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 shadow-lg"
            >
              Delete Dependency (Del)
            </button>
          </div>
        )}

        {/* Task Bars */}
        {visibleTasks.map((task, index) => {
          const position = getTaskPosition(task);
          if (!position) return null;

          const isSummary = isSummaryTask(task._id);

          return (
            <div
              key={task._id}
              className="absolute border-b border-gray-100"
              style={{
                top: index * 40,
                height: 40,
                left: 0,
                right: 0,
              }}
            >
              <div className="relative h-full flex items-center">
                {isSummary ? (
                  // Summary bar
                  <div
                    className="absolute flex items-center"
                    style={{ left: position.left, width: position.width }}
                  >
                    <div className="h-2 bg-gray-400 rounded-full relative w-full">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rotate-45"></div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rotate-45"></div>
                    </div>
                    <div className="absolute -top-4 left-0 text-xs text-gray-600 whitespace-nowrap">
                      {task.name} | {formatDate(task.startDate)} - {formatDate(task.endDate)}
                    </div>
                  </div>
                ) : task.isMilestone ? (
                  // Milestone diamond
                  <div
                    className="absolute cursor-pointer"
                    style={{ left: position.left }}
                    onMouseDown={(e) => handleMouseDown(e, task._id, "move")}
                  >
                    <div className="w-4 h-4 bg-yellow-500 border-2 border-yellow-600 rotate-45 relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap -rotate-45">
                        {task.name}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Normal task bar
                  (() => {
                    const taskIndex = tasks.findIndex(t => t._id === task._id);
                    const barColor = getTaskDisplayColor(task, colorByMode, colorTheme, taskIndex, members);
                    const progressColor = getProgressColor(barColor);
                    const textColor = getTextColor(barColor);
                    
                    return (
                      <div
                        className="absolute group cursor-move"
                        style={{ left: position.left, width: position.width }}
                        onMouseDown={(e) => handleMouseDown(e, task._id, "move")}
                      >
                        <div className="h-7 rounded relative overflow-hidden" style={{ backgroundColor: barColor }}>
                          {/* Progress fill */}
                          <div
                            className="absolute inset-y-0 left-0 rounded"
                            style={{ width: `${task.progress || 0}%`, backgroundColor: progressColor }}
                          ></div>

                          {/* Task name */}
                          <div className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate z-10" style={{ color: textColor }}>
                            {task.name}
                          </div>

                          {/* Resize handles */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100"
                            style={{ backgroundColor: progressColor }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, task._id, "resize-left");
                            }}
                          ></div>
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100"
                            style={{ backgroundColor: progressColor }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDown(e, task._id, "resize-right");
                            }}
                          ></div>

                          {/* Dependency handle - only show if not read-only */}
                          {!isReadOnly && (
                            <div
                              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2 border-white cursor-crosshair opacity-0 group-hover:opacity-100 z-20"
                              style={{ backgroundColor: progressColor }}
                              onMouseDown={(e) => handleDependencyHandleMouseDown(e, task._id)}
                              title="Drag to create dependency"
                            ></div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
