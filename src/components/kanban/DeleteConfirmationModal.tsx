'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Task } from '@/types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  task: Task | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationModal({
  isOpen,
  task,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="bg-red-500/10 border-b border-red-500/20 p-6 relative">
                <button
                  onClick={onCancel}
                  className="absolute top-4 right-4 p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-red-500" />
                </button>
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, -5, 5, -5, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                    className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
                  >
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Delete Task?</h3>
                    <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-foreground">
                  Are you sure you want to delete this task?
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {task.title}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-muted/30 border-t border-border p-4 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Delete Task
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
