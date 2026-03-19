'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { DropIndicator } from './DropIndicator';

interface KanbanColumnProps {
  title: string;
  column: string;
  headingColor: string;
  cards: Task[];
  setCards: (cards: Task[]) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  canChangeStatus: boolean;
  spaceMembers: any[];
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function KanbanColumn({
  title,
  column,
  headingColor,
  cards,
  setCards,
  onStatusChange,
  canChangeStatus,
  spaceMembers,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const [active, setActive] = useState(false);

  const handleDragStart = (e: React.DragEvent, card: Task) => {
    if (!canChangeStatus) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('cardId', card._id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const cardId = e.dataTransfer.getData('cardId');

    setActive(false);
    clearHighlights();
    
    // Always call onDragEnd to reset parent state
    onDragEnd();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);

    const before = element?.dataset.before || '-1';

    if (before !== cardId) {
      let copy = [...cards];

      let cardToTransfer = copy.find((c) => c._id === cardId);
      if (!cardToTransfer) return;

      const oldStatus = cardToTransfer.status;
      cardToTransfer = { ...cardToTransfer, status: column as Task['status'] };

      copy = copy.filter((c) => c._id !== cardId);

      const moveToBack = before === '-1';

      if (moveToBack) {
        copy.push(cardToTransfer);
      } else {
        const insertAtIndex = copy.findIndex((el) => el._id === before);
        if (insertAtIndex === undefined) return;

        copy.splice(insertAtIndex, 0, cardToTransfer);
      }

      setCards(copy);

      // Notify parent of status change if column changed
      if (oldStatus !== column) {
        onStatusChange(cardId, column as Task['status']);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();

    indicators.forEach((i) => {
      i.style.opacity = '0';
    });
  };

  const highlightIndicator = (e: React.DragEvent) => {
    const indicators = getIndicators();

    clearHighlights(indicators);

    const el = getNearestIndicator(e, indicators);

    el.element.style.opacity = '1';
  };

  const getNearestIndicator = (e: React.DragEvent, indicators: HTMLElement[]) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();

        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );

    return el;
  };

  const getIndicators = (): HTMLElement[] => {
    return Array.from(document.querySelectorAll(`[data-column="${column}"]`));
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c) => c.status === column);

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-semibold text-sm ${headingColor}`}>{title}</h3>
        <span className="rounded text-sm text-muted-foreground">{filteredCards.length}</span>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`h-full w-full rounded-lg p-2 transition-colors overflow-y-auto ${
          active ? 'bg-muted/50' : 'bg-muted/20'
        }`}
      >
        {filteredCards.map((c) => {
          return (
            <TaskCard
              key={c._id}
              task={c}
              handleDragStart={handleDragStart}
              canDrag={canChangeStatus}
              spaceMembers={spaceMembers}
            />
          );
        })}
        <DropIndicator beforeId={null} column={column} />
      </div>
    </div>
  );
}
