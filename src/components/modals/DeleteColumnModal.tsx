'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnNumber: number;
  onConfirm: () => void;
}

export function DeleteColumnModal({ open, onOpenChange, columnNumber, onConfirm }: DeleteColumnModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Delete Column</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Are you sure you want to delete <span className="font-semibold text-foreground">Column {columnNumber}</span>? 
            This action cannot be undone and all data in this column will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="w-full sm:w-auto"
          >
            Delete Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
