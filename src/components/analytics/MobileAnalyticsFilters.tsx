'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type AnalyticsRange = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
export type AnalyticsView = 'workspace' | 'personal';

interface MobileAnalyticsFiltersProps {
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  availableViews: readonly AnalyticsView[];
  selectedView: AnalyticsView;
  onViewChange: (view: AnalyticsView) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

const ranges: { value: AnalyticsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom dates' },
];

export function MobileAnalyticsFilters({
  range,
  onRangeChange,
  availableViews,
  selectedView,
  onViewChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: MobileAnalyticsFiltersProps) {
  return (
    <div className={`grid gap-2 ${availableViews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <Select value={range} onValueChange={(value) => onRangeChange(value as AnalyticsRange)}>
        <SelectTrigger
          aria-label="Date range"
          className="h-10 min-w-0 rounded-xl border-border/70 bg-card px-3 text-xs font-medium shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl">
          {ranges.map(({ value, label }) => (
            <SelectItem key={value} value={value} className="min-h-10 rounded-lg text-sm">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {availableViews.length > 1 && (
        <Select value={selectedView} onValueChange={(value) => onViewChange(value as AnalyticsView)}>
          <SelectTrigger
            aria-label="Analytics view"
            className="h-10 min-w-0 rounded-xl border-border/70 bg-card px-3 text-xs font-medium shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl">
            {availableViews.includes('workspace') && <SelectItem value="workspace" className="min-h-10 rounded-lg text-sm">Workspace view</SelectItem>}
            {availableViews.includes('personal') && <SelectItem value="personal" className="min-h-10 rounded-lg text-sm">Personal view</SelectItem>}
          </SelectContent>
        </Select>
      )}

      {range === 'custom' && (
        <div className="col-span-full grid grid-cols-2 gap-2">
          <input
            aria-label="From date"
            type="date"
            className="h-10 min-w-0 rounded-xl border border-border/70 bg-card px-2 text-xs"
            value={customFrom}
            onChange={(event) => onCustomFromChange(event.target.value)}
          />
          <input
            aria-label="To date"
            type="date"
            className="h-10 min-w-0 rounded-xl border border-border/70 bg-card px-2 text-xs"
            value={customTo}
            onChange={(event) => onCustomToChange(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
