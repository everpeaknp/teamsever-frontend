// Color theme definitions and utilities for Gantt charts

export interface ColorTheme {
  id: string;
  name: string;
  colors: string[]; // Palette of colors to cycle through
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    colors: ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  },
  {
    id: 'purple',
    name: 'Purple',
    colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: ['#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'],
  },
];

export type ColorByMode = 'task' | 'status' | 'assignee';

// Default color from backend schema
export const DEFAULT_TASK_COLOR = '#3b82f6';

// Status colors for "Color by Status" mode
export const STATUS_COLORS: Record<string, string> = {
  'not-started': '#9ca3af', // gray-400
  'in-progress': '#3b82f6', // blue-600
  'completed': '#10b981', // green-600
  'on-hold': '#ef4444', // red-500
};

// Stable assignee color palette (used for "Color by Assignee" mode)
export const ASSIGNEE_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange-600
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#a855f7', // purple-500
];

/**
 * Check if a task has a custom color (not default or empty)
 */
export function hasCustomColor(color?: string): boolean {
  if (!color || color.trim() === '') return false;
  return color.toLowerCase() !== DEFAULT_TASK_COLOR.toLowerCase();
}

/**
 * Get theme color by index (cycles through palette)
 */
export function getThemeColor(themeId: string, index: number): string {
  const theme = COLOR_THEMES.find(t => t.id === themeId);
  if (!theme) return DEFAULT_TASK_COLOR;
  return theme.colors[index % theme.colors.length];
}

/**
 * Get color for a task based on color-by mode
 */
export function getTaskDisplayColor(
  task: { color?: string; status?: string; assigneeId?: string },
  colorByMode: ColorByMode,
  themeId: string,
  taskIndex: number,
  members: Array<{ _id: string }>
): string {
  // If task has a custom color, always use it regardless of mode
  if (hasCustomColor(task.color)) {
    return task.color!;
  }

  // Otherwise, apply color-by mode
  switch (colorByMode) {
    case 'status':
      return STATUS_COLORS[task.status || 'not-started'] || STATUS_COLORS['not-started'];
    
    case 'assignee':
      if (task.assigneeId) {
        const memberIndex = members.findIndex(m => m._id === task.assigneeId);
        if (memberIndex >= 0) {
          return ASSIGNEE_PALETTE[memberIndex % ASSIGNEE_PALETTE.length];
        }
      }
      return '#9ca3af'; // gray for unassigned
    
    case 'task':
    default:
      // Use theme color
      return getThemeColor(themeId, taskIndex);
  }
}

/**
 * Calculate luminance to determine if text should be light or dark
 */
export function getTextColor(backgroundColor: string): string {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get darker shade for progress fill
 */
export function getProgressColor(baseColor: string): string {
  const hex = baseColor.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Simple hash function for stable color assignment
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
