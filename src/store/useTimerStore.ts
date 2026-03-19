import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
  // Active timer data
  activeTaskId: string | null;
  taskTitle: string | null;
  startTime: number | null; // Timestamp in milliseconds
  isTimerRunning: boolean;
  
  // Actions
  startTimer: (taskId: string, taskTitle: string, startTime?: number) => void;
  stopTimer: () => void;
  getElapsedTime: () => number;
  getFormattedTime: () => string;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeTaskId: null,
      taskTitle: null,
      startTime: null,
      isTimerRunning: false,

      // Start timer
      startTimer: (taskId: string, taskTitle: string, startTime?: number) => {
        set({
          activeTaskId: taskId,
          taskTitle,
          startTime: startTime || Date.now(),
          isTimerRunning: true,
        });
      },

      // Stop timer
      stopTimer: () => {
        set({
          activeTaskId: null,
          taskTitle: null,
          startTime: null,
          isTimerRunning: false,
        });
      },

      // Get elapsed time in milliseconds
      getElapsedTime: () => {
        const { startTime, isTimerRunning } = get();
        if (!isTimerRunning || !startTime) return 0;
        return Date.now() - startTime;
      },

      // Get formatted time string (HH:MM:SS)
      getFormattedTime: () => {
        const elapsed = get().getElapsedTime();
        return formatTime(elapsed);
      },
    }),
    {
      name: 'timer-storage', // Key in localStorage
      partialize: (state) => ({
        // Only persist these fields
        activeTaskId: state.activeTaskId,
        taskTitle: state.taskTitle,
        startTime: state.startTime,
        isTimerRunning: state.isTimerRunning,
      }),
    }
  )
);

// Helper function to format time
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Helper function to format duration for display
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0m';

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

// Helper function to parse duration strings like "2h 30m"
export function parseDuration(input: string): number | null {
  const str = input.toLowerCase().trim();
  let totalMs = 0;

  // Match patterns like "2h 30m", "1.5h", "90m", "2d 3h"
  const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*d/);
  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = str.match(/(\d+(?:\.\d+)?)\s*m/);
  const secondMatch = str.match(/(\d+(?:\.\d+)?)\s*s/);

  if (dayMatch) {
    totalMs += parseFloat(dayMatch[1]) * 24 * 60 * 60 * 1000;
  }
  if (hourMatch) {
    totalMs += parseFloat(hourMatch[1]) * 60 * 60 * 1000;
  }
  if (minuteMatch) {
    totalMs += parseFloat(minuteMatch[1]) * 60 * 1000;
  }
  if (secondMatch) {
    totalMs += parseFloat(secondMatch[1]) * 1000;
  }

  return totalMs > 0 ? totalMs : null;
}
