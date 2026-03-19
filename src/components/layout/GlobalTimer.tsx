'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Square, Clock } from 'lucide-react';
import { useTimerStore } from '@/store/useTimerStore';
import { api } from '@/lib/axios';

export default function GlobalTimer() {
  const router = useRouter();
  const {
    activeTaskId,
    taskTitle,
    startTime,
    isTimerRunning,
    stopTimer,
    getFormattedTime,
  } = useTimerStore();

  const [displayTime, setDisplayTime] = useState('00:00:00');
  const [isStopping, setIsStopping] = useState(false);

  // Update timer display every second
  useEffect(() => {
    if (!isTimerRunning) {
      setDisplayTime('00:00:00');
      return;
    }

    // Update immediately
    setDisplayTime(getFormattedTime());

    // Then update every second
    const interval = setInterval(() => {
      setDisplayTime(getFormattedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, startTime, getFormattedTime]);

  // Update document title when timer is active
  useEffect(() => {
    if (isTimerRunning && taskTitle) {
      document.title = `⏱️ ${displayTime} - ${taskTitle}`;
    } else {
      document.title = 'Teamsever';
    }

    return () => {
      document.title = 'Teamsever';
    };
  }, [isTimerRunning, displayTime, taskTitle]);

  const handleStopTimer = async () => {
    if (!activeTaskId || isStopping) return;

    setIsStopping(true);
    try {
      await api.post(`/tasks/${activeTaskId}/time/stop`);
      stopTimer();
    } catch (error: any) {
      console.error('Failed to stop timer:', error);
      alert(error.response?.data?.message || 'Failed to stop timer');
    } finally {
      setIsStopping(false);
    }
  };

  const handleClickTimer = () => {
    if (activeTaskId) {
      // Navigate to task detail (you can adjust this based on your routing)
      router.push(`/task/${activeTaskId}`);
    }
  };

  if (!isTimerRunning || !activeTaskId) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border-2 border-purple-500 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Pulsing Play Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
          <div className="relative w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        </div>

        {/* Timer Info */}
        <button
          onClick={handleClickTimer}
          className="flex flex-col items-start hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-2xl font-mono font-bold text-gray-900 tabular-nums">
              {displayTime}
            </span>
          </div>
          <span className="text-sm text-gray-600 truncate max-w-[200px]">
            {taskTitle}
          </span>
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStopTimer}
          disabled={isStopping}
          className="ml-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Stop timer"
        >
          {isStopping ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Square className="w-4 h-4 fill-white" />
          )}
        </button>
      </div>

      {/* Progress bar animation */}
      <div className="h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 animate-pulse"></div>
    </div>
  );
}
