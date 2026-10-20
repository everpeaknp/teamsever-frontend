'use client';

import type { ReactNode } from 'react';
import { Briefcase, CheckSquare, Layout, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type UsageMetric = {
  value: string;
  percentage?: number;
};

type WorkspacePlanSummaryProps = {
  planName: string;
  planStatus: ReactNode;
  workspaces: UsageMetric;
  spaces: UsageMetric;
  tasks: UsageMetric;
  members: UsageMetric;
  onUpgrade: () => void;
  showUpgrade?: boolean;
};

const metrics = [
  { key: 'workspaces', label: 'Workspaces', Icon: Briefcase },
  { key: 'spaces', label: 'Spaces', Icon: Layout },
  { key: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { key: 'members', label: 'Members', Icon: Users },
] as const;

export function WorkspacePlanSummary({
  planName,
  planStatus,
  workspaces,
  spaces,
  tasks,
  members,
  onUpgrade,
  showUpgrade = false,
}: WorkspacePlanSummaryProps) {
  const usage = { workspaces, spaces, tasks, members };

  return (
    <Card className="mb-6 sm:mb-8">
      <CardHeader className="px-4 pb-3 pt-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{planName}</h3>
            <p className="text-sm text-muted-foreground">{planStatus}</p>
          </div>
          {showUpgrade && (
            <Button size="sm" className="h-9 shrink-0 px-3" onClick={onUpgrade}>
              Upgrade
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:p-6">
        <div
          data-testid="workspace-plan-summary-grid"
          className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 md:gap-6"
        >
          {metrics.map(({ key, label, Icon }) => {
            const metric = usage[key];
            return (
              <div key={key} className="min-w-0 space-y-1 sm:space-y-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate text-xs sm:text-sm">{label}</span>
                </div>
                <div className="text-lg font-semibold leading-tight sm:text-2xl">
                  {metric.value}
                </div>
                {metric.percentage !== undefined && (
                  <Progress
                    value={metric.percentage}
                    className="hidden h-1.5 sm:block"
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
