'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, X, FileText, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';

interface ParsedTask {
  name: string;
  phase: string;
  assignee: string;
  start: string;
  duration: number;
  progress: number;
}

interface PdfUploadSectionProps {
  workspaceId: string;
  chartId: string;
  onTasksImported: () => void;
}

export function PdfUploadSection({ workspaceId, chartId, onTasksImported }: PdfUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('PDF must be smaller than 10MB');
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        setSelectedFile(file);
        handleUpload(file);
      }
    },
    [workspaceId, chartId]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setParsedTasks([]);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await api.post(`/gantt/${chartId}/upload-pdf?workspaceId=${workspaceId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setParsedTasks(res.data.tasks || []);

      toast.success(`Found ${res.data.tasks?.length || 0} tasks. Review and confirm to import.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditTask = (index: number, field: keyof ParsedTask, value: string | number) => {
    const updated = [...parsedTasks];
    updated[index] = { ...updated[index], [field]: value };
    setParsedTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setParsedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    if (parsedTasks.length === 0) return;

    try {
      const tasksWithIds = parsedTasks.map((t, idx) => ({
        ...t,
        id: `task-${Date.now()}-${idx}`,
        dependsOn: [],
        color: '#3b82f6',
      }));

      await api.put(`/gantt/${chartId}`, { tasks: tasksWithIds });

      toast.success(`${parsedTasks.length} tasks added to the chart`);

      setParsedTasks([]);
      setSelectedFile(null);
      onTasksImported();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleCancel = () => {
    setParsedTasks([]);
    setSelectedFile(null);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Import Tasks from PDF</Label>
        <p className="text-sm text-muted-foreground">
          Upload a PDF containing a project schedule or task list. We'll extract tasks automatically.
        </p>
      </div>

      {parsedTasks.length === 0 ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isUploading ? 'Parsing PDF...' : 'Drag and drop your PDF here'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isUploading ? 'Please wait...' : 'or click to browse (max 10MB)'}
              </p>
            </div>
            {!isUploading && (
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="pdf-upload-input"
                />
                <label htmlFor="pdf-upload-input">
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Choose PDF
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{selectedFile.name}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">{parsedTasks.length} tasks extracted</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmImport}>
                Confirm & Import
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Task Name</TableHead>
                    <TableHead className="w-[150px]">Phase</TableHead>
                    <TableHead className="w-[150px]">Assignee</TableHead>
                    <TableHead className="w-[120px]">Start Date</TableHead>
                    <TableHead className="w-[100px]">Duration</TableHead>
                    <TableHead className="w-[100px]">Progress</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTasks.map((task, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={task.name}
                          onChange={(e) => handleEditTask(idx, 'name', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={task.phase}
                          onChange={(e) => handleEditTask(idx, 'phase', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={task.assignee}
                          onChange={(e) => handleEditTask(idx, 'assignee', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={task.start}
                          onChange={(e) => handleEditTask(idx, 'start', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={task.duration}
                          onChange={(e) => handleEditTask(idx, 'duration', parseInt(e.target.value) || 1)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={task.progress}
                          onChange={(e) => handleEditTask(idx, 'progress', parseInt(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveTask(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-900 dark:text-blue-100">
              Review the extracted tasks above. You can edit any field before importing. Click "Confirm & Import" to add them to your chart.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
