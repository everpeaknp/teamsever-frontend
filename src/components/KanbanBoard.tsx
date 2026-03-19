'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types';
import confetti from 'canvas-confetti';
import { KanbanColumn } from './kanban/KanbanColumn';
import { DeleteZone } from './kanban/DeleteZone';
import { DeleteConfirmationModal } from './kanban/DeleteConfirmationModal';
import { useTaskStore } from '@/store/useTaskStore';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  canChangeStatus: boolean;
  canDelete?: boolean;
  spaceMembers: any[];
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', headingColor: 'text-slate-600 dark:text-slate-400' },
  { id: 'inprogress', title: 'In Progress', headingColor: 'text-blue-600 dark:text-blue-400' },
  { id: 'review', title: 'In Review', headingColor: 'text-purple-600 dark:text-purple-400' },
  { id: 'done', title: 'Done', headingColor: 'text-green-600 dark:text-green-400' },
] as const;

export function KanbanBoard({ tasks, onStatusChange, canChangeStatus, canDelete = false, spaceMembers }: KanbanBoardProps) {
  const [cards, setCards] = useState<Task[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { deleteTask } = useTaskStore();

  // Sync tasks prop with local state
  useEffect(() => {
    setCards(tasks);
  }, [tasks]);

  const handleDragStart = () => {
    if (canChangeStatus) {
      setIsDragging(true);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsOverDeleteZone(false);
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    if (!canChangeStatus) return;
    
    console.log('[KanbanBoard] Status change:', taskId, newStatus);
    onStatusChange(taskId, newStatus);
    
    // Confetti for done tasks
    if (newStatus === 'done') {
      setTimeout(() => {
        triggerConfetti();
      }, 100);
    }
  };

  const handleDeleteZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cardId = e.dataTransfer.getData('cardId');
    
    // Reset drag state first
    setIsDragging(false);
    setIsOverDeleteZone(false);
    
    if (cardId && canDelete) {
      const task = cards.find((c) => c._id === cardId);
      if (task) {
        setTaskToDelete(task);
        setShowDeleteModal(true);
      }
    }
  };

  const handleDeleteZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverDeleteZone(true);
  };

  const handleDeleteZoneDragLeave = () => {
    setIsOverDeleteZone(false);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        console.log('[KanbanBoard] Deleting task:', taskToDelete._id);
        await deleteTask(taskToDelete._id);
      } catch (error) {
        console.error('[KanbanBoard] Failed to delete task:', error);
      } finally {
        // Always reset state
        setShowDeleteModal(false);
        setTaskToDelete(null);
        setIsDragging(false);
        setIsOverDeleteZone(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTaskToDelete(null);
    setIsDragging(false);
    setIsOverDeleteZone(false);
  };

  const triggerConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#86efac', '#4ade80'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#86efac', '#4ade80'],
      });
    }, 250);
  };

  return (
    <>
      <div className="h-[calc(100vh-220px)] w-full px-6 pb-6 overflow-hidden">
        <div className="flex h-full w-full gap-3">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              title={column.title}
              column={column.id}
              headingColor={column.headingColor}
              cards={cards}
              setCards={setCards}
              onStatusChange={handleStatusChange}
              canChangeStatus={canChangeStatus}
              spaceMembers={spaceMembers}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Delete Zone - Bottom Center - Only show when dragging AND user has delete permission */}
      {canDelete && isDragging && (
        <DeleteZone
          isVisible={true}
          isOver={isOverDeleteZone}
          onDrop={handleDeleteZoneDrop}
          onDragOver={handleDeleteZoneDragOver}
          onDragLeave={handleDeleteZoneDragLeave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        task={taskToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
