'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  show: boolean;
  currentColor?: string;
  onColorSelect: (color: string | null) => void;
  onClose: () => void;
}

const TUPLE_COLORS = [
  // Row 1 - Neutrals and Reds
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#F3F4F6', name: 'Light Gray' },
  { hex: '#9CA3AF', name: 'Gray' },
  { hex: '#FEE2E2', name: 'Light Red' },
  { hex: '#EF4444', name: 'Red' },
  
  // Row 2 - Oranges, Yellows, and Greens
  { hex: '#FED7AA', name: 'Light Orange' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#FEF3C7', name: 'Light Yellow' },
  { hex: '#D1FAE5', name: 'Light Green' },
  { hex: '#10B981', name: 'Green' },
  
  // Row 3 - Blues, Purples, and Pinks
  { hex: '#DBEAFE', name: 'Light Blue' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#DDD6FE', name: 'Light Purple' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  show,
  currentColor,
  onColorSelect,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  // Handle keyboard navigation in color grid
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const cols = 5; // 5 columns per row
    const rows = Math.ceil(TUPLE_COLORS.length / cols);
    const currentRow = Math.floor(index / cols);
    const currentCol = index % cols;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (index < TUPLE_COLORS.length - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        const nextRowIndex = (currentRow + 1) * cols + currentCol;
        if (nextRowIndex < TUPLE_COLORS.length) {
          setFocusedIndex(nextRowIndex);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentRow > 0) {
          const prevRowIndex = (currentRow - 1) * cols + currentCol;
          setFocusedIndex(prevRowIndex);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onColorSelect(TUPLE_COLORS[index].hex);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!show) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      style={{ minWidth: '240px' }}
      role="dialog"
      aria-label="Color picker"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Choose Color</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close color picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="grid grid-cols-5 gap-2 mb-3"
        role="grid"
        aria-label="Color selection grid"
      >
        {TUPLE_COLORS.map((color, index) => (
          <button
            key={color.hex}
            className="relative w-8 h-8 rounded border-2 hover:border-gray-400 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: color.hex,
              borderColor: currentColor === color.hex ? '#3B82F6' : '#E5E7EB',
            }}
            onClick={() => onColorSelect(color.hex)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            tabIndex={focusedIndex === index ? 0 : -1}
            role="gridcell"
            aria-label={`${color.name} color ${currentColor === color.hex ? '(selected)' : ''}`}
            aria-selected={currentColor === color.hex}
            ref={(el) => {
              if (el && focusedIndex === index) {
                el.focus();
              }
            }}
          >
            {currentColor === color.hex && (
              <Check className="h-4 w-4 absolute inset-0 m-auto text-gray-700" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onColorSelect(null)}
        aria-label="Remove cell background color"
      >
        Remove Color
      </Button>
    </div>
  );
};
