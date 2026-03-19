'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { useTimerStore, formatDuration, parseDuration } from '@/store/useTimerStore';
import { api } from '@/lib/axios';

interface TimeLog {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  startTime: string;
  endTime?: string;
  duration: number;
  description?: string;
  isManual: boolean;
}

interface TimeTrackingProps {
  taskId: string;
  taskTitle: string;
}

export default function TimeTracking({ taskId, taskTitle }: TimeTrackingProps) {
  const {
    activeTaskId,
    isTimerRunning,
    startTimer,
    stopTimer,
  } = useTimerStore();

  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [addingManual, setAddingManual] = useState(false);

  const isThisTaskActive = isTimerRunning && activeTaskId === taskId;

  useEffect(() => {
    fetchTimeLogs();
  }, [taskId]);

  const fetchTimeLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${taskId}/time/logs`);
      setTimeLogs(response.data.data.timeLogs || []);
      setTotalTimeSpent(response.data.data.totalTimeSpent || 0);
    } catch (error) {
      console.error('Failed to fetch time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    if (starting) return;

    setStarting(true);
    try {
      const response = await api.post(`/tasks/${taskId}/time/start`);
      const startTime = new Date(response.data.data.startTime).getTime();
      startTimer(taskId, taskTitle, startTime);
    } catch (error: any) {
      console.error('Failed to start timer:', error);
      alert(error.response?.data?.message || 'Failed to start timer');
    } finally {
      setStarting(false);
    }
  };

  const handleStopTimer = async () => {
    if (stopping) return;

    setStopping(true);
    try {
      await api.post(`/tasks/${taskId}/time/stop`);
      stopTimer();
      await fetchTimeLogs();
    } catch (error: any) {
      console.error('Failed to stop timer:', error);
      alert(error.response?.data?.message || 'Failed to stop timer');
    } finally {
      setStopping(false);
    }
  };

  const handleAddManualLog = async () => {
    if (!manualDuration.trim() || addingManual) return;

    setAddingManual(true);
    try {
      await api.post(`/tasks/${taskId}/time/manual`, {
        duration: manualDuration,
        description: manualDescription,
      });
      
      setManualDuration('');
      setManualDescription('');
      setShowManualEntry(false);
      await fetchTimeLogs();
    } catch (error: any) {
      console.error('Failed to add manual log:', error);
      alert(error.response?.data?.message || 'Failed to add manual time log');
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Delete this time log?')) return;

    try {
      await api.delete(`/tasks/${taskId}/time/logs/${logId}`);
      await fetchTimeLogs();
    } catch (error: any) {
      console.error('Failed to delete log:', error);
      alert(error.response?.data?.message || 'Failed to delete time log');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timer Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Time Tracking</h3>
        </div>

        {isThisTaskActive ? (
          <button
            onClick={handleStopTimer}
            disabled={stopping}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {stopping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Square className="w-4 h-4 fill-white" />
            )}
            Stop Timer
          </button>
        ) : (
          <button
            onClick={handleStartTimer}
            disabled={starting || (isTimerRunning && activeTaskId !== taskId)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            Start Timer
          </button>
        )}
      </div>

      {/* Total Time Spent */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-sm text-purple-700 font-medium">Total Time Spent</div>
        <div className="text-3xl font-bold text-purple-900 mt-1">
          {formatDuration(totalTimeSpent)}
        </div>
      </div>

      {/* Manual Entry Toggle */}
      <button
        onClick={() => setShowManualEntry(!showManualEntry)}
        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Manual Time Log
      </button>

      {/* Manual Entry Form */}
      {showManualEntry && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (e.g., "2h 30m", "1.5h", "90m")
            </label>
            <input
              type="text"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
              placeholder="2h 30m"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="What did you work on?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddManualLog}
              disabled={!manualDuration.trim() || addingManual}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addingManual ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Log'
              )}
            </button>
            <button
              onClick={() => {
                setShowManualEntry(false);
                setManualDuration('');
                setManualDescription('');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Time Logs List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Time Logs</h4>
        
        {timeLogs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No time logs yet. Start tracking time!
          </p>
        ) : (
          <div className="space-y-2">
            {timeLogs.map((log) => (
              <div
                key={log._id}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {formatDuration(log.duration)}
                      </span>
                      {log.isManual && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(log.startTime).toLocaleString()}
                    </div>
                    {log.description && (
                      <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      by {log.user.name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log._id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
