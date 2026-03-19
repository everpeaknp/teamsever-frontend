'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DeleteZoneProps {
  isVisible: boolean;
  isOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}

export function DeleteZone({ isVisible, isOver, onDrop, onDragOver, onDragLeave }: DeleteZoneProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            animate={{
              scale: isOver ? 1.1 : 1,
              backgroundColor: isOver ? 'rgb(239, 68, 68)' : 'rgba(239, 68, 68, 0.08)',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full
              border border-red-400/50 backdrop-blur-sm
              ${isOver ? 'shadow-lg shadow-red-500/30' : 'shadow-md'}
            `}
          >
            <motion.div
              animate={{
                scale: isOver ? 1.2 : 1,
                rotate: isOver ? [0, -8, 8, -8, 8, 0] : 0,
              }}
              transition={{
                scale: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                },
                rotate: {
                  duration: 0.4,
                  ease: 'easeInOut',
                },
              }}
            >
              <Trash2 className={`w-5 h-5 ${isOver ? 'text-white' : 'text-red-500'} stroke-[1.5]`} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
