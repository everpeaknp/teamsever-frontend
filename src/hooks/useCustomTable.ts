import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/axios';
import { ICustomTable } from '@/types/pro-features';
import { toast } from 'sonner';

interface UseCustomTableReturn {
  table: ICustomTable | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateCell: (rowId: string, columnId: string, value: any) => void;
  updateCellColor: (rowId: string, columnId: string, color: string | null, silent?: boolean) => Promise<void>;
  updateCellTextColor: (rowId: string, columnId: string, color: string | null, silent?: boolean) => Promise<void>;
  addRow: () => Promise<string | null>;
  deleteRow: (rowId: string) => Promise<void>;
  addColumn: () => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  loadTable: () => Promise<void>;
}

/**
 * Custom hook for managing custom table data
 * Handles table operations with optimistic updates and debouncing
 * 
 * @param tableId - The ID of the table
 * @returns Object containing table data and management functions
 */
export const useCustomTable = (tableId: string): UseCustomTableReturn => {
  const [table, setTable] = useState<ICustomTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load table data from the API
   */
  const loadTable = useCallback(async () => {
    if (!tableId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/tables/${tableId}`);
      // Backend returns { success: true, data: table }
      const tableData = response.data.data || response.data.table;
      if (tableData) {
        // Convert plain objects to Maps for data, colors, and textColors
        const normalizedTable = {
          ...tableData,
          rows: tableData.rows.map((row: any) => ({
            ...row,
            data: row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {})),
            colors: row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {})),
            textColors: row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}))
          }))
        };
        setTable(normalizedTable);
      } else {
        console.error('[useCustomTable] No table data in response:', response.data);
        setError('Table data not found in response');
        toast.error('Failed to load table data');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load table';
      console.error('Failed to load table:', {
        tableId,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  /**
   * Update a cell value with immediate save and optimistic update
   * 
   * @param rowId - The ID of the row
   * @param columnId - The ID of the column
   * @param value - The new cell value
   */
  const updateCell = useCallback(async (
    rowId: string,
    columnId: string,
    value: any
  ) => {
    // Store previous state for rollback
    const previousTable = table;

    // Optimistic update
    setTable(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map(row => {
          if (row.id === rowId) {
            // Handle both Map and plain object from backend
            const currentData = row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {}));
            const newData = new Map(currentData);
            newData.set(columnId, value);
            return { ...row, data: newData };
          }
          return row;
        })
      };
    });

    // Save immediately
    setSaving(true);
    try {
      const response = await api.patch(`/tables/${tableId}/rows/${rowId}/cells/${columnId}`, { value });
      
      // Reload table data from backend to ensure we have the latest
      const tableData = response.data.data;
      if (tableData) {
        const normalizedTable = {
          ...tableData,
          rows: tableData.rows.map((row: any) => ({
            ...row,
            data: row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {})),
            colors: row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {})),
            textColors: row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}))
          }))
        };
        setTable(normalizedTable);
      }
    } catch (err: any) {
      // Revert on error
      const errorMessage = err.response?.data?.message || 'Failed to save changes';
      console.error('Failed to save cell update:', {
        tableId,
        rowId,
        columnId,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setTable(previousTable);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [tableId, table]);

  /**
   * Update a cell's background color with optimistic update
   * 
   * @param rowId - The ID of the row
   * @param columnId - The ID of the column
   * @param color - The hex color string (null to remove)
   * @param silent - If true, don't show toast notifications
   */
  const updateCellColor = useCallback(async (
    rowId: string,
    columnId: string,
    color: string | null,
    silent: boolean = false
  ) => {
    // Store previous state for rollback
    const previousTable = table;

    // Optimistic update
    setTable(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map(row => {
          if (row.id === rowId) {
            // Handle both Map and plain object from backend
            const currentColors = row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {}));
            const newColors = new Map(currentColors) as Map<string, string>;
            if (color === null) {
              newColors.delete(columnId);
            } else {
              newColors.set(columnId, color);
            }
            return { ...row, colors: newColors };
          }
          return row;
        })
      };
    });

    try {
      const response = await api.patch(
        `/tables/${tableId}/rows/${rowId}/colors/${columnId}`,
        { color }
      );
      
      // Reload table data from backend to ensure we have the latest
      const tableData = response.data.data;
      if (tableData) {
        const normalizedTable = {
          ...tableData,
          rows: tableData.rows.map((row: any) => ({
            ...row,
            data: row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {})),
            colors: row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {})),
            textColors: row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}))
          }))
        };
        setTable(normalizedTable);
      }
      
      if (!silent) {
        toast.success('Color updated');
      }
    } catch (err: any) {
      // Revert on error
      const errorMessage = err.response?.data?.message || 'Failed to update cell color';
      console.error('Failed to update cell color:', {
        tableId,
        rowId,
        columnId,
        color,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setTable(previousTable);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [tableId, table]);

  /**
   * Update a cell's text color with optimistic update
   * 
   * @param rowId - The ID of the row
   * @param columnId - The ID of the column
   * @param color - The hex color string (null to remove)
   * @param silent - If true, don't show toast notifications
   */
  const updateCellTextColor = useCallback(async (
    rowId: string,
    columnId: string,
    color: string | null,
    silent: boolean = false
  ) => {
    // Store previous state for rollback
    const previousTable = table;

    // Optimistic update
    setTable(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map(row => {
          if (row.id === rowId) {
            // Handle both Map and plain object from backend
            const currentTextColors = row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}));
            const newTextColors = new Map(currentTextColors) as Map<string, string>;
            if (color === null) {
              newTextColors.delete(columnId);
            } else {
              newTextColors.set(columnId, color);
            }
            return { ...row, textColors: newTextColors };
          }
          return row;
        })
      };
    });

    try {
      const response = await api.patch(
        `/tables/${tableId}/rows/${rowId}/text-colors/${columnId}`,
        { color }
      );
      
      // Reload table data from backend to ensure we have the latest
      const tableData = response.data.data;
      if (tableData) {
        const normalizedTable = {
          ...tableData,
          rows: tableData.rows.map((row: any) => ({
            ...row,
            data: row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {})),
            colors: row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {})),
            textColors: row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}))
          }))
        };
        setTable(normalizedTable);
      }
      
      if (!silent) {
        toast.success('Text color updated');
      }
    } catch (err: any) {
      // Revert on error
      const errorMessage = err.response?.data?.message || 'Failed to update cell text color';
      console.error('Failed to update cell text color:', {
        tableId,
        rowId,
        columnId,
        color,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setTable(previousTable);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [tableId, table]);

  /**
   * Add a new row to the table with entitlement check
   * 
   * @returns The ID of the newly created row, or null on failure
   */
  const addRow = useCallback(async (): Promise<string | null> => {
    try {
      const response = await api.post(`/tables/${tableId}/rows`);
      // Backend returns { success: true, data: table }
      const tableData = response.data.data || response.data.table;
      if (tableData) {
        // Convert plain objects to Maps for data, colors, and textColors
        const normalizedTable = {
          ...tableData,
          rows: tableData.rows.map((row: any) => ({
            ...row,
            data: row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {})),
            colors: row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {})),
            textColors: row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}))
          }))
        };
        setTable(normalizedTable);
      }
      toast.success('Row added');
      return response.data.rowId || null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add row';
      console.error('Failed to add row:', {
        tableId,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [tableId]);

  /**
   * Delete a row from the table with optimistic update
   * 
   * @param rowId - The ID of the row to delete
   */
  const deleteRow = useCallback(async (rowId: string) => {
    // Store previous state for rollback
    const previousTable = table;

    // Optimistic update
    setTable(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.filter(row => row.id !== rowId)
      };
    });

    try {
      await api.delete(`/tables/${tableId}/rows/${rowId}`);
      toast.success('Row deleted');
    } catch (err: any) {
      // Revert on error
      const errorMessage = err.response?.data?.message || 'Failed to delete row';
      console.error('Failed to delete row:', {
        tableId,
        rowId,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setTable(previousTable);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [tableId, table]);

  /**
   * Add a new column to the table
   */
  const addColumn = useCallback(async (): Promise<void> => {
    try {
      // Generate a default column title based on current column count
      const columnCount = table?.columns.length || 0;
      const defaultTitle = `Column ${columnCount + 1}`;
      
      const response = await api.post(`/tables/${tableId}/columns`, {
        title: defaultTitle,
        type: 'text'
      });
      const tableData = response.data.data;
      if (tableData) {
        const normalizedTable = {
          ...tableData,
          rows: tableData.rows.map((row: any) => ({
            ...row,
            data: row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {})),
            colors: row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {})),
            textColors: row.textColors instanceof Map ? row.textColors : new Map(Object.entries(row.textColors || {}))
          }))
        };
        setTable(normalizedTable);
      }
      toast.success('Column added');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add column';
      const errorCode = err.response?.data?.code;
      console.error('Failed to add column:', err);
      setError(errorMessage);
      
      // Check if it's a limit error
      if (errorCode === 'COLUMN_LIMIT_REACHED') {
        toast.error(errorMessage);
        throw new Error('COLUMN_LIMIT_REACHED');
      } else {
        toast.error(errorMessage);
      }
      throw err;
    }
  }, [tableId, table]);

  /**
   * Delete a column from the table
   */
  const deleteColumn = useCallback(async (columnId: string) => {
    const previousTable = table;

    // Optimistic update
    setTable(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.filter(col => col.id !== columnId),
        rows: prev.rows.map(row => {
          const newData = new Map(row.data);
          const newColors = new Map(row.colors);
          const newTextColors = new Map(row.textColors);
          newData.delete(columnId);
          newColors.delete(columnId);
          newTextColors.delete(columnId);
          return { ...row, data: newData, colors: newColors, textColors: newTextColors };
        })
      };
    });

    try {
      await api.delete(`/tables/${tableId}/columns/${columnId}`);
      toast.success('Column deleted');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete column';
      console.error('Failed to delete column:', err);
      setTable(previousTable);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [tableId, table]);

  // Load table on mount
  useEffect(() => {
    if (tableId) {
      loadTable();
    }
  }, [tableId, loadTable]);

  return {
    table,
    loading,
    saving,
    error,
    updateCell,
    updateCellColor,
    updateCellTextColor,
    addRow,
    deleteRow,
    addColumn,
    deleteColumn,
    loadTable
  };
};
