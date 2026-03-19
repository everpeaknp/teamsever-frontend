'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface ExportButtonProps {
  tableId: string;
  tableName?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ tableId, tableName }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      const response = await api.get(`/tables/${tableId}/export`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tableName || 'table'}-export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Table exported successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to export table';
      console.error('Export failed:', {
        tableId,
        tableName,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>Export to Excel</span>
        </>
      )}
    </Button>
  );
};
