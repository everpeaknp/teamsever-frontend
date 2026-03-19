'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { toast } from 'sonner';

interface CellEditorProps {
  value: any;
  color?: string;
  textColor?: string;
  type: 'text' | 'link' | 'number';
  isEditing?: boolean;
  readOnly?: boolean;
  showColorPicker?: boolean;
  onValueChange: (value: any) => void;
  onColorChange: (color: string | null) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

const CellEditorComponent: React.FC<CellEditorProps> = ({
  value,
  color,
  textColor: propTextColor,
  type,
  isEditing: externalIsEditing,
  readOnly = false,
  showColorPicker: externalShowColorPicker = true,
  onValueChange,
  onColorChange,
  onEditStart,
  onEditEnd,
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const [localValue, setLocalValue] = useState(value ?? '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Check color contrast and determine if text should be dark or light
  const getTextColor = (bgColor?: string): string => {
    if (!bgColor) return 'inherit';

    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return dark text for light backgrounds, light text for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Use propTextColor if provided, otherwise auto-calculate based on background
  const textColor = propTextColor || getTextColor(color);

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const validate = (val: any): boolean => {
    setError(null);

    if (!val && val !== 0) {
      return true; // Allow empty values
    }

    switch (type) {
      case 'number':
        if (isNaN(Number(val))) {
          setError('Must be a valid number');
          return false;
        }
        break;

      case 'link':
        try {
          new URL(val);
        } catch {
          setError('Must be a valid URL');
          return false;
        }
        break;
    }

    return true;
  };

  const handleSave = () => {
    const currentValue = editableRef.current?.textContent || '';
    
    if (validate(currentValue)) {
      const finalValue = type === 'number' && currentValue !== '' ? Number(currentValue) : currentValue;
      onValueChange(finalValue);
      setLocalValue(currentValue);
      if (externalIsEditing === undefined) {
        setInternalIsEditing(false);
      }
      onEditEnd?.();
    } else {
      // Show toast for validation error
      toast.error(error || 'Invalid value');
      // Revert to previous value
      if (editableRef.current) {
        editableRef.current.textContent = localValue;
      }
    }
  };

  const handleCancel = () => {
    if (editableRef.current) {
      editableRef.current.textContent = localValue;
    }
    setError(null);
    if (externalIsEditing === undefined) {
      setInternalIsEditing(false);
    }
    onEditEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  };

  const handleCellClick = () => {
    if (!isEditing && !readOnly) {
      if (externalIsEditing === undefined) {
        setInternalIsEditing(true);
      }
      onEditStart?.();
    }
  };

  const renderContent = () => {
    if (type === 'link' && !isEditing && value) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
          style={{ color: textColor === '#FFFFFF' ? '#93C5FD' : undefined }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Link to ${value}`}
        >
          {value}
        </a>
      );
    }

    // Inline editable div (like sticky notes)
    return (
      <div
        ref={editableRef}
        contentEditable={isEditing && !readOnly}
        suppressContentEditableWarning
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`outline-none whitespace-pre-wrap break-words text-sm ${
          isEditing ? 'cursor-text' : 'cursor-pointer'
        }`}
        style={{ 
          color: textColor,
          minHeight: '1.25em',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          lineHeight: '1.5'
        }}
      >
        {localValue}
      </div>
    );
  };

  return (
    <div
      ref={cellRef}
      className="relative group h-full min-h-[40px] px-3 py-2 flex items-center justify-between overflow-visible hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
      style={{ backgroundColor: color || 'transparent' }}
      onClick={handleCellClick}
      role="button"
      aria-label={`Edit cell, current value: ${value || 'empty'}`}
    >
      <div className="flex-1 min-w-0 relative z-10 bg-inherit pr-2" style={{ backgroundColor: color || 'transparent' }}>
        {renderContent()}
      </div>

      {!readOnly && externalShowColorPicker && (
        <button
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-white/80 dark:hover:bg-gray-900/80 rounded z-20 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          aria-label="Change cell background color"
          title="Change color"
          tabIndex={-1}
        >
          <Palette className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" style={{ color: textColor === '#FFFFFF' ? '#D1D5DB' : undefined }} />
        </button>
      )}

      {showColorPicker && !readOnly && externalShowColorPicker && (
        <div className="absolute top-full left-0 z-50 mt-1">
          <ColorPicker
            show={showColorPicker}
            currentColor={color}
            onColorSelect={(newColor) => {
              onColorChange(newColor);
              setShowColorPicker(false);
            }}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}
    </div>
  );
};

// Memoized export with custom comparison for performance
export const CellEditor = React.memo(CellEditorComponent, (prevProps, nextProps) => {
  // Return true if props are equal (no re-render needed)
  // Return false if props are different (re-render needed)
  return (
    prevProps.value === nextProps.value &&
    prevProps.color === nextProps.color &&
    prevProps.textColor === nextProps.textColor &&
    prevProps.type === nextProps.type &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.readOnly === nextProps.readOnly
  );
});

CellEditor.displayName = 'CellEditor';
