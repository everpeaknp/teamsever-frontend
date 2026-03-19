import { useState, useEffect, useCallback } from 'react';

interface UseCellEditorReturn {
  isEditing: boolean;
  value: any;
  error: string | null;
  setValue: (value: any) => void;
  setIsEditing: (editing: boolean) => void;
  handleSave: () => void;
  handleCancel: () => void;
}

/**
 * Custom hook for managing cell editing state
 * Handles validation, save, and cancel operations
 * 
 * @param initialValue - The initial cell value
 * @param type - The column type ('text', 'link', or 'number')
 * @param onSave - Callback function to save the cell value
 * @returns Object containing editing state and control functions
 */
export const useCellEditor = (
  initialValue: any,
  type: 'text' | 'link' | 'number',
  onSave: (value: any) => void
): UseCellEditorReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  // Update local value when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  /**
   * Validate the cell value based on column type
   * 
   * @param val - The value to validate
   * @returns True if valid, false otherwise
   */
  const validate = useCallback((val: any): boolean => {
    setError(null);

    // Allow empty values
    if (val === null || val === undefined || val === '') {
      return true;
    }

    switch (type) {
      case 'number':
        const num = Number(val);
        if (isNaN(num)) {
          setError('Must be a valid number');
          return false;
        }
        break;

      case 'link':
        try {
          // Basic URL validation
          const urlStr = String(val).trim();
          if (urlStr) {
            new URL(urlStr);
          }
        } catch {
          setError('Must be a valid URL');
          return false;
        }
        break;

      case 'text':
        // Text values are always valid
        break;

      default:
        break;
    }

    return true;
  }, [type]);

  /**
   * Handle save operation with validation
   * Calls onSave callback if validation passes
   */
  const handleSave = useCallback(() => {
    if (validate(value)) {
      onSave(value);
      setIsEditing(false);
      setError(null);
    }
  }, [value, validate, onSave]);

  /**
   * Handle cancel operation
   * Reverts to initial value and closes editor
   */
  const handleCancel = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setIsEditing(false);
  }, [initialValue]);

  return {
    isEditing,
    value,
    error,
    setValue,
    setIsEditing,
    handleSave,
    handleCancel
  };
};
